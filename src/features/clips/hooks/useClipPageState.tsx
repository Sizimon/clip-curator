import { useState, useRef, useEffect, useMemo } from 'react';
import { useTimestamps } from './useTimestamps';
import { Clip, CuratorData } from '@/types/types'
import { toast } from 'react-toastify'
import { useAuth } from '@/features/auth/context/authProvider';
import { useClip } from '@/features/clips/context/clipProvider';
import { useRouter } from 'next/navigation';

export function useClipPageState(clipId?: number) {

  const router = useRouter();
  const [currentClip, setCurrentClip] = useState<Clip | null>(null);
  const [clipTitle, setClipTitle] = useState('');

  // Video States
  const [clipUrl, setClipUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [retainedVolume, setRetainedVolume] = useState(1);

  // Modal States
  const [timestampModalOpen, setTimestampModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const playerRef = useRef<any>(null);

  // Timestamps
  const { timestamps, addTimestamp, clearTimestamps, loadTimestamps } = useTimestamps();
  const { isAuthenticated } = useAuth()
  const { createClip, updateClip, clips } = useClip()

  const [hasLoadedClipData, setHasLoadedClipData] = useState(false);

  // Memoize the current clip to prevent unnecessary lookups
  const foundClip = useMemo(() => {
    if (!clipId || !clips.length) return null;
    return clips.find(clip => Number(clip.id) === clipId) || null;
  }, [clipId, clips.length]); // Use clips.length instead of clips array

  // Single effect to handle all clip loading logic
  useEffect(() => {
    if (!clipId || !isAuthenticated) {
      setCurrentClip(null);
      setHasLoadedClipData(false);
      return;
    }

    if (!foundClip) {
      setCurrentClip(null);
      setHasLoadedClipData(false);
      return;
    }

    // Only load if we haven't loaded this clip's data yet
    if (!hasLoadedClipData || !currentClip || currentClip.id !== foundClip.id) {
      setCurrentClip(foundClip);
      setClipTitle(foundClip.title || '');
      setClipUrl(foundClip.clipUrl || '');
      loadTimestamps(foundClip.timestamps || []);
      setHasLoadedClipData(true);
    }
  }, [clipId, isAuthenticated, foundClip, hasLoadedClipData, currentClip, loadTimestamps]);

  // Handlers (copy from your main page)
  const handleTimestampModal = () => {
    if (!clipUrl) {
      toast.error('Please enter a valid clip URL before adding timestamps');
      return;
    };
    setTimestampModalOpen(true);
  };

  const handleChangeClipTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (clipUrl.length > 0) {
      setClipTitle?.(e.target.value);
    } else {
      toast.error('Please enter a valid clip URL before setting a title');
    }
  }

  const handleAddTimestamp = (title: string, note: string) => {
    if (!title || !note) {
      toast.error('Please provide both a title and a note for the timestamp');
      return;
    };
    addTimestamp(currentTime, title, note);
    setTimestampModalOpen(false);
  };

  const handleToTimestamp = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
    }
  };

  // Handler which saves the clip data to the database
  const handleSave = async (title: string) => {
    if (!title) {
      toast.error('Please provide a title for the clip before saving');
      return;
    }

    if (!clipUrl && !timestamps.length) {
      toast.error('Cannot save an empty clip. Please add a clip URL and at least one timestamp.');
      return;
    }

    const clipData = {
      clipUrl: clipUrl,
      timestamps: timestamps
    }

    if (!currentClip && !clipData) {
      toast.error('No curator data to save');
      return;
    }

    if (!isAuthenticated) {
      toast.error('You must be logged in to save clips');
      setSignInModalOpen(true);
      return;
    }
    setIsSaving(true);

    try {
      if (!currentClip) {
        const response = await createClip(title, clipData as CuratorData);
        if (response.success) {
          toast.success('Clip saved successfully');
          router.push(`/clips/${response.id}`);
        } else if (response.error) {
          toast.error(response.error || 'Failed to save clip');
        }
      } else {
        const response = await updateClip(Number(currentClip.id), title, clipData as CuratorData);
        if (response.success) {
          toast.success('Clip updated successfully');
        } else if (response.error) {
          toast.error(response.error || 'Failed to update clip');
        }
      }
    } catch (error) {
      console.error('Error saving clip:', error);
      toast.error('Network error - please try again');
    } finally {
      setIsSaving(false);
      setSaveModalOpen(false);
    }
  }

  return {
    currentClip, setCurrentClip,
    clipTitle, setClipTitle,
    clipUrl, setClipUrl,
    currentTime, setCurrentTime,
    retainedVolume, setRetainedVolume,
    timestampModalOpen, setTimestampModalOpen,
    saveModalOpen, setSaveModalOpen,
    signInModalOpen, setSignInModalOpen,
    isSaving, setIsSaving,
    playerRef,
    timestamps, addTimestamp, clearTimestamps, loadTimestamps,
    handleTimestampModal,
    handleAddTimestamp,
    handleToTimestamp,
    handleSave,
    handleChangeClipTitle
  };
}