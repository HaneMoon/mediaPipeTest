import React, { useRef, useEffect, useState } from 'react';
import {
    ObjectDetector,
    FilesetResolver,
    type Detection, // Detection型をインポート
} from '@mediapipe/tasks-vision';
import './index.css';
const MediaPipeTest: React.FC = () => {
    // useRefにHTMLVideoElementとHTMLCanvasElementの型を指定
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // useStateにObjectDetectorまたはnullの型を指定
    const [objectDetector, setObjectDetector] = useState<ObjectDetector | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);

    // MediaPipe ObjectDetectorの初期化
    useEffect(() => {
        const initializeObjectDetector = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                const detector = await ObjectDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                        delegate: "CPU", // 可能であればGPUを使用
                    },
                    runningMode: "VIDEO",
                });
                setObjectDetector(detector);
                setLoading(false);
            } catch (err: any) { // エラーオブジェクトにany型を使用、またはより具体的な型に絞る
                console.error("Failed to initialize ObjectDetector:", err);
                setError(`物体検出モデルの初期化に失敗しました: ${err.message || err}`);
                setLoading(false);
            }
        };

        initializeObjectDetector();
    }, []);

    // カメラストリームの取得とCanvasのセットアップ
    useEffect(() => {
        // objectDetectorがnullの場合は処理しない
        if (!objectDetector) return;

        const setupCamera = async () => {
            // videoRef.currentがnullでないことを確認
            if (videoRef.current) {
                try {
                    // MediaStreamConstraintsにfacingModeの型を指定
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); // メインカメラを使用
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play(); // videoRef.currentがnullでないことを確認
                        setHasCameraPermission(true);
                        requestAnimationFrame(detectObjects); // 映像がロードされたら検出開始
                        console.log('Video dimensions:', videoRef.current?.videoWidth, videoRef.current?.videoHeight);
                    };
                } catch (err: any) {
                    console.error('カメラへのアクセスに失敗しました:', err);
                    setError(`カメラへのアクセス許可が得られませんでした: ${err.message || err}`);
                }
            }
        };

        const detectObjects = () => {
            // 全ての参照が有効で、ビデオが再生可能状態であることを確認
            if (objectDetector && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (!context) {
                    console.error('Canvas 2D context is not available.');
                    return;
                }

                // Canvasのサイズをビデオに合わせる
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log(canvas.width,canvas.height)

                // 物体検出の実行
                // detectionsの型はMediaPipeから提供される
                const detections = objectDetector.detectForVideo(video, performance.now());

                // Canvasをクリアして新しいフレームを描画
                context.clearRect(0, 0, canvas.width, canvas.height); // Canvasをクリア
                context.drawImage(video, 0, 0, canvas.width, canvas.height); // ビデオを描画
                // 検出結果の描画
                if (detections.detections.length > 0) {
                    detections.detections.forEach((detection: Detection) => { // detectionにDetection型を指定
                        const bbox = detection.boundingBox;
                        // categoryがundefinedでないことを確認し、配列の0番目にアクセス
                        const category = detection.categories?.[0];

                        if (!bbox || !category) {
                            return; // バウンディングボックスやカテゴリがなければスキップ
                        }
                        // console.log(`Checking BBox: x=${bbox.originX}, y=${bbox.originY}, w=${bbox.width}, h=${bbox.height}`);
                        if (
                            bbox.originX < 0 || bbox.originY < 0 ||
                            bbox.width <= 0 || bbox.height <= 0 ||
                            bbox.originX + bbox.width > canvas.width ||
                            bbox.originY + bbox.height > canvas.height
                        ) {
                            console.warn(`Invalid BBox detected, skipping:`, bbox);
                            return; // 不正なバウンディングボックスはスキップ
                        }
                        // 矩形の描画
                        context.strokeStyle = 'red';
                        context.lineWidth = 2;context.beginPath()
                        context.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
                        context.closePath();

                        // ラベルの描画
                        // context.fillStyle = 'red';
                        // context.font = '16px Arial';
                        // const label = `${category.categoryName} (${(category.score * 100).toFixed(0)}%)`;
                        // context.fillText(label, bbox.originX + 5, bbox.originY + 20);
                    });
                }
            }
            requestAnimationFrame(detectObjects); // 次のフレームで再度検出
        };

        setupCamera();

        // コンポーネントのアンマウント時にオブジェクトとストリームをクリーンアップ
        return () => {
            if (objectDetector) {
                objectDetector.close();
            }
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream; // 型アサーション
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [objectDetector]); // objectDetectorが初期化されたら実行

    if (loading) {
        return <div className="App"><h1>モデルをロード中...</h1></div>;
    }

    if (error) {
        return <div className="App error-message"><h1>エラー: {error}</h1></div>;
    }

    return (
        <div className="App">
            <h1>React MediaPipe 物体検出</h1>
            {!hasCameraPermission && <p className="permission-message">カメラへのアクセスを許可してください。</p>}
            <div className="video-container">
                {/* video要素は非表示だが、ストリームのソースとして必要 */}
                <video ref={videoRef} className="input-video" playsInline ></video>
                <canvas ref={canvasRef} className="output-canvas"></canvas>
            </div>
            <p className="note">ウェブカメラを有効にして、物体が検出されるのを確認してください。</p>
        </div>
    );
};

export default MediaPipeTest;