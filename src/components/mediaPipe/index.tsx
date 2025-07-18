import { useState, useEffect, useRef } from "react"
import {
    ObjectDetector,
    FilesetResolver,
    type Detection
} from "@mediapipe/tasks-vision"
import styles from "./index.module.scss"

const MediaPipeTest = () => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [ObjectDetector, setObjectDetector] = useState<ObjectDetector | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [hasCameraPremission, setHasCameraPremission] = useState<boolean>(false);

    useEffect(() => {
        const initObjectDetector = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                )
                const detector = await ObjectDetector.createFromOptions(vision, {
                    baseOption: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO"
                })
                setObjectDetector(detector)
                setLoading(false)
            } catch (errot: any) {
                console.log("エラー")
                setLoading(false)
            }
        }
        initObjectDetector();
    }, [])

    useEffect(() => {
        if (!ObjectDetector) return
        const setupCamera = async () => {
            if (videoRef.current) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    videoRef.current.srcObject = stream
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play()
                        setHasCameraPremission(true);
                        requestAnimationFrame(detectObjects)
                    }
                } catch (error: any) {
                    console.log("カメラのエラー")
                }
            }
        }

        const detectObjects = () => {
            if (ObjectDetector && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
                const video = videoRef.current
                const canvas = canvasRef.current
                const context = canvas.getContext('2d')

                if (!context) {
                    console.log("コンテキストがないよ")
                    return
                }

                canvas.width = video.videoWidth
                canvas.height = video.videoHeight

                const detecion = ObjectDetector.detectForVideo(video, performance.now())

                context.clearRect(0, 0, canvas.width, canvas.height)
                context.drawImage(video, 0, 0, canvas.width, canvas.height)

                if (detecion.detections.length > 0) {
                    detecion.detections.forEach((detecion: Detection) => {
                        const bbox = detecion.boundingBox
                        const category = detecion.categories?.[0]
                        if (!bbox || !category) {
                            return
                        }

                        context.strokeStyle = 'red'
                        context.lineWidth = 2
                        context.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height)

                        context.fillStyle = 'red'
                        context.font = '16px Arial'
                        const label = `${category.categoryName}( ${(category.score * 100).toFixed(0)}%)`
                        context.fillText(label, bbox.originX + 5, bbox.originY + 20)
                    })
                }
            }
            requestAnimationFrame(detectObjects)
        }
        setupCamera();
    
        return()=>{
            if(ObjectDetector){
                ObjectDetector.close()
            }
            if(videoRef.current&&videoRef.current.srcObject){
                const stream=videoRef.current.srcObject as MediaStream
                stream.getTracks().forEach(track=>track.stop())
            }
        }
    }, [ObjectDetector])

    if(loading){
        return <div><h1>モデルをロード中</h1></div>
    }

    return (
        <>
        <div>
            <h1>medai pipeのテスト</h1>
            {!hasCameraPremission&&<p>カメラのアクセスを許可してください</p>}
            <div>
                <video ref={videoRef} playsInline style={{display:'none'}}></video>
                <canvas  ref={canvasRef}></canvas>
            </div>
            <p>カメラを有効にして、物体検出します</p>
        </div>
        </>
    )
}

export default MediaPipeTest;