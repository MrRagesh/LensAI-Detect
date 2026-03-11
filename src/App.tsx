import { Scan, AlertCircle, Play, Square, Activity } from 'lucide-react'
import { useObjectDetection } from './hooks/useObjectDetection'

function App() {
    const {
        videoRef,
        canvasRef,
        isLoaded,
        error,
        detectedCount,
        startDetection,
        stopDetection,
        isDetecting // Use this instead of local state
    } = useObjectDetection()

    const handleToggle = () => {
        if (isDetecting) {
            stopDetection()
        } else {
            startDetection()
        }
    }

    return (
        <div className="app-container">
            <header className="header">
                <div className="logo">
                    <Scan className="icon text-primary" />
                    <h1>LensAI Detect</h1>
                </div>
                <div className={`status-badge ${isLoaded ? 'ready' : 'loading'}`}>
                    <span className="dot"></span>
                    {isLoaded ? 'System Ready' : 'Initializing Engine...'}
                </div>
            </header>

            <main className="main-content">
                <div className="vision-container">
                    <div className="video-wrapper">
                        <video
                            ref={videoRef}
                            className="video-feed"
                            muted
                            playsInline
                            style={{ display: isDetecting ? 'block' : 'none' }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="canvas-overlay"
                            style={{ display: isDetecting ? 'block' : 'none' }}
                        />

                        {error && (
                            <div className="error-message">
                                <AlertCircle className="icon" />
                                <p>{error}</p>
                            </div>
                        )}

                        {!isDetecting && !error && (
                            <div className="placeholder-content">
                                <div className="radar-animation"></div>
                                <h2>Awaiting Visual Input</h2>
                                <p>Activate the camera to begin real-time object detection processing.</p>
                            </div>
                        )}
                    </div>

                    <div className="sidebar">
                        <div className="control-panel">
                            <button
                                className={`action-btn ${isDetecting ? 'btn-stop' : 'btn-start'}`}
                                onClick={handleToggle}
                                disabled={!isLoaded}
                            >
                                {isDetecting ? (
                                    <>
                                        <Square size={20} className="btn-icon" />
                                        <span>Halt Detection</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={20} className="btn-icon" />
                                        <span>Initialize Camera</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="stats-card">
                            <div className="card-header">
                                <Activity size={18} className="text-secondary" />
                                <h3>Telemetry</h3>
                            </div>
                            <ul className="stats-list">
                                <li className="stat-item">
                                    <span className="stat-label">Model Engine</span>
                                    <span className="stat-value highlight">MobileNet V2</span>
                                </li>
                                <li className="stat-item">
                                    <span className="stat-label">System Status</span>
                                    <span className={`stat-value ${isDetecting ? 'active-text' : ''}`}>
                                        {isDetecting ? 'Processing...' : 'Idle'}
                                    </span>
                                </li>
                                <li className="stat-item">
                                    <span className="stat-label">Objects Detected</span>
                                    <span className="stat-value big-number">{detectedCount}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="info-card">
                            <h3>About LensAI</h3>
                            <p>
                                Powered by TensorFlow.js and a high-accuracy MobileNet V2 engine, this system runs heavy neural network inferences entirely within your browser environment. All processing is localized, ensuring absolute privacy and peak precision.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default App
