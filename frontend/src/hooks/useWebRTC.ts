import { useState, useRef, useCallback } from 'react'

export interface MediaDevices {
  audioInput: string
  videoInput: string
  audioOutput: string
}

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  const loadDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    setDevices(all)
    return all
  }, [])

  const startMedia = useCallback(async (constraints?: MediaStreamConstraints) => {
    const stream = await navigator.mediaDevices.getUserMedia(
      constraints ?? { audio: true, video: true }
    )
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
  }, [])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
    setIsMuted((m) => !m)
  }, [])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
    setCameraOff((off) => !off)
  }, [])

  const startScreenShare = useCallback(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    screenStreamRef.current = stream
    setIsScreenSharing(true)
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      setIsScreenSharing(false)
      screenStreamRef.current = null
    })
    return stream
  }, [])

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    setIsScreenSharing(false)
  }, [])

  const switchAudioInput = useCallback(async (deviceId: string) => {
    const stream = localStreamRef.current
    if (!stream) return
    const newAudio = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } })
    const [newTrack] = newAudio.getAudioTracks()
    const [oldTrack] = stream.getAudioTracks()
    if (oldTrack) stream.removeTrack(oldTrack)
    stream.addTrack(newTrack)
  }, [])

  return {
    localStream,
    isMuted,
    cameraOff,
    isScreenSharing,
    devices,
    loadDevices,
    startMedia,
    stopMedia,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    switchAudioInput,
  }
}
