import { useState, useEffect, useRef, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

export interface DetectionResult {
    class: string
    score: number
    bbox: [number, number, number, number]
}

export function useObjectDetection() {
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [detectedCount, setDetectedCount] = useState(0)

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
    const isDetectingRef = useRef(false)
    const animationFrameId = useRef<number>()

    // Initialize TensorFlow and load COCO-SSD
    useEffect(() => {
        const loadModel = async () => {
            try {
                await tf.ready()
                const model = await cocoSsd.load({
                    base: 'mobilenet_v2' // Load full MobileNetV2 model for higher accuracy
                })
                modelRef.current = model
                setIsLoaded(true)
            } catch (err: any) {
                console.error('Failed to load TensorFlow model:', err)
                setError(err.message || 'Failed to load model')
            }
        }

        loadModel()

        return () => {
            isDetectingRef.current = false
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
            }
        }
    }, [])

    // Start Webcam
    const startWebcam = useCallback(async () => {
        if (!videoRef.current) {
            setError('Video element not found')
            return false
        }

        try {
            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Webcam access not supported in this browser. Please use Chrome or Safari.')
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            })

            videoRef.current.srcObject = stream

            // Ensure video plays before resolving
            return await new Promise<boolean>((resolve) => {
                if (videoRef.current) {
                    videoRef.current.onloadedmetadata = async () => {
                        try {
                            await videoRef.current?.play()
                            resolve(true)
                        } catch (playError: any) {
                            console.error('Error playing video:', playError)
                            setError(`Failed to play video: ${playError.message}`)
                            resolve(false) // Don't reject, just handle gracefully
                        }
                    }
                } else {
                    resolve(false)
                }
            })
        } catch (err: any) {
            console.error('Webcam initialization failed:', err)

            // Provide more user-friendly error messages based on the error name
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Camera access denied. Please allow camera permissions in your browser settings and try again.')
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('No camera found on this device.')
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setError('Camera is already in use by another application.')
            } else {
                setError(`Camera error: ${err.message || 'Unknown error occurred'}`)
            }
            return false
        }
    }, [])

    // Detection loop
    const detectFrame = useCallback(async () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        const model = modelRef.current

        if (!video || !canvas || !model || !isDetectingRef.current) return

        // Ensure video is ready
        if (video.readyState !== 4) {
            animationFrameId.current = requestAnimationFrame(detectFrame)
            return
        }

        // Match canvas dimensions to video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        try {
            const rawPredictions = await model.detect(video)
            // Filter out low confidence detections to simulate a higher accuracy threshold
            const predictions = rawPredictions.filter(p => p.score > 0.65)

            // Clear previous drawing
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            setDetectedCount(predictions.length)

            // Draw bounding boxes
            predictions.forEach((prediction) => {
                const [x, y, width, height] = prediction.bbox
                const text = `${prediction.class} - ${Math.round(prediction.score * 100)}%`

                // Style
                ctx.strokeStyle = '#00ff88'
                ctx.lineWidth = 4
                ctx.fillStyle = '#00ff88'
                ctx.font = 'bold 18px Inter, system-ui, sans-serif'

                // Draw Box
                ctx.beginPath()
                ctx.roundRect(x, y, width, height, 8)
                ctx.stroke()

                // Draw Label Background
                const textWidth = ctx.measureText(text).width
                const textHeight = 24
                ctx.fillRect(x, y - textHeight, textWidth + 10, textHeight)

                // Draw Text
                ctx.fillStyle = '#000000'
                ctx.fillText(text, x + 5, y - 6)
            })
        } catch (err) {
            console.error('Detection error:', err)
        }

        // Continue loop
        if (isDetectingRef.current) {
            animationFrameId.current = requestAnimationFrame(detectFrame)
        }
    }, [])

    // Control detection
    const startDetection = useCallback(async () => {
        if (!isLoaded || !modelRef.current || !videoRef.current) return

        setError(null)

        if (!videoRef.current.srcObject) {
            const success = await startWebcam()
            if (!success) {
                // startWebcam already set the error
                return
            }
        }

        if (!isDetectingRef.current) {
            isDetectingRef.current = true
            detectFrame()
        }
    }, [isLoaded, startWebcam, detectFrame])

    const stopDetection = useCallback(() => {
        isDetectingRef.current = false

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => {
                track.stop()
            });
            videoRef.current.srcObject = null
        }

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
            }
        }
        setDetectedCount(0)
    }, [])

    return {
        videoRef,
        canvasRef,
        isLoaded,
        error,
        detectedCount,
        startDetection,
        stopDetection,
        isDetecting: isDetectingRef.current
    }
}
