/**
 * Vishal Enterprises CRM - Real Device Camera Attendance Component
 * Live video stream capture, instant preview, duplicate prevention, and personal history
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, Clock, Calendar, ShieldCheck, Eye } from 'lucide-react';
import { AttendanceRecord, User } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface AttendanceCameraProps {
  user: User;
}

export const AttendanceCamera: React.FC<AttendanceCameraProps> = ({ user }) => {
  const [todayStatus, setTodayStatus] = useState<{
    marked: boolean;
    record: AttendanceRecord | null;
    currentDate: string;
    currentTime: string;
  } | null>(null);

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewModalPhoto, setPreviewModalPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadTodayAttendance();
    loadHistory();
    return () => {
      stopCameraStream();
    };
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const data = await fetchApi('/api/attendance/today');
      setTodayStatus(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchApi<AttendanceRecord[]>('/api/attendance/history');
      setHistory(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const startCamera = async () => {
    setError(null);
    setCameraError(null);
    setCapturedPhoto(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('No camera was detected on this device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      mediaStreamRef.current = stream;
      setCameraActive(true);

      // Attach stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            setCameraError('Camera connection was interrupted. Please try again.');
          });
        }
      }, 200);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission is required to mark attendance.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera was detected on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is currently unavailable. Please check your device camera and try again.');
      } else {
        setCameraError('Camera connection was interrupted. Please try again.');
      }
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal for natural mirror selfie effect
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Photo = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(base64Photo);
    stopCameraStream();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const submitAttendance = async () => {
    if (!capturedPhoto) {
      setError('Please capture your photo to mark attendance.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi<{ message: string; record: AttendanceRecord }>('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ capturedPhoto }),
      });

      setSuccessMsg('Attendance submitted successfully! Status: Present.');
      setCapturedPhoto(null);
      await loadTodayAttendance();
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to submit attendance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            Staff Daily Attendance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real device camera capture verification for staff members.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{todayStatus?.currentDate || new Date().toISOString().split('T')[0]}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{todayStatus?.currentTime || 'Current Time'}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Today's Attendance Card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Today&apos;s Status</h3>

        {todayStatus?.marked && todayStatus.record ? (
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
            <div className="relative group shrink-0">
              <img
                src={todayStatus.record.capturedPhoto}
                alt="Today Attendance Selfie"
                className="w-28 h-28 object-cover rounded-xl border border-emerald-700 shadow-md"
              />
              <button
                onClick={() => setPreviewModalPhoto(todayStatus.record!.capturedPhoto)}
                className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-semibold rounded-full border border-emerald-500/30">
                <CheckCircle className="w-3.5 h-3.5" />
                Status: Present
              </div>
              <p className="font-mono text-slate-400">
                Attendance ID: <span className="text-white font-semibold">{todayStatus.record.attendanceId}</span>
              </p>
              <p>
                Staff: <span className="text-white">{todayStatus.record.staffName}</span> ({todayStatus.record.staffId})
              </p>
              <p>
                Department: <span className="text-white">{todayStatus.record.department}</span> • Role:{' '}
                <span className="text-white">{todayStatus.record.designation}</span>
              </p>
              <p>
                Time: <span className="text-white font-mono">{todayStatus.record.exactTime}</span> ({todayStatus.record.date})
              </p>
            </div>
          </div>
        ) : (
          <div>
            {!cameraActive && !capturedPhoto && (
              <div className="text-center py-8 px-4 bg-slate-900/50 rounded-xl border border-slate-700/60">
                <div className="w-14 h-14 mx-auto mb-3 bg-blue-600/10 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/20">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-white">Attendance Not Marked Yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Camera access is required to mark attendance. Please allow camera access when prompted.
                </p>

                {cameraError && (
                  <div className="mt-4 p-3 max-w-md mx-auto bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <button
                  id="btn-mark-attendance"
                  type="button"
                  onClick={startCamera}
                  className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Mark Attendance
                </button>
              </div>
            )}

            {/* Live Camera Feed */}
            {cameraActive && (
              <div className="max-w-md mx-auto bg-slate-900 rounded-2xl p-4 border border-slate-700">
                <p className="text-xs text-slate-300 text-center mb-3 font-medium">
                  Live Camera Verification • Center your face in the frame
                </p>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute inset-0 border-2 border-dashed border-blue-500/40 pointer-events-none rounded-xl m-4" />
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="w-1/3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-capture-photo"
                    type="button"
                    onClick={capturePhoto}
                    className="w-2/3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Camera className="w-4 h-4" />
                    Capture Photo
                  </button>
                </div>
              </div>
            )}

            {/* Captured Photo Preview */}
            {capturedPhoto && (
              <div className="max-w-md mx-auto bg-slate-900 rounded-2xl p-4 border border-slate-700">
                <p className="text-xs text-emerald-400 text-center mb-3 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Photo Captured Preview
                </p>

                <div className="rounded-xl overflow-hidden bg-black aspect-video border border-slate-700">
                  <img src={capturedPhoto} alt="Captured preview" className="w-full h-full object-cover" />
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retake Photo
                  </button>
                  <button
                    id="btn-submit-attendance"
                    type="button"
                    disabled={loading}
                    onClick={submitAttendance}
                    className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {loading ? 'Submitting...' : 'Submit Attendance'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staff Personal Attendance History */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">My Attendance History</h3>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No historical attendance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Attendance ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{rec.attendanceId}</td>
                    <td className="py-2.5 px-3">{rec.date}</td>
                    <td className="py-2.5 px-3 font-mono">{rec.exactTime}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => setPreviewModalPhoto(rec.capturedPhoto)}
                        className="p-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Photo</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo Fullscreen Viewer */}
      {previewModalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-semibold text-white">Attendance Verification Image</span>
              <button
                onClick={() => setPreviewModalPhoto(null)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-3 rounded-xl overflow-hidden bg-black">
              <img src={previewModalPhoto} alt="Attendance photo" className="w-full h-auto object-contain max-h-[70vh]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
