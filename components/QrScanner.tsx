import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { parseQrTicket, QrTicket } from '../services/qrTicket';

interface QrScannerProps {
    onDetect: (ticket: QrTicket) => void;  // QR de resguardo SELAE reconocido
    onClose: () => void;
}

/**
 * Lector de QR por cámara. Decodifica el QR en el navegador (jsQR) y, si es un
 * resguardo de SELAE, lo interpreta con parseQrTicket y lo entrega al padre.
 * No envía la imagen a ningún servidor.
 */
const QrScanner: React.FC<QrScannerProps> = ({ onDetect, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;

        const parar = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };

        const tick = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });

            if (code && code.data) {
                const ticket = parseQrTicket(code.data);
                if (ticket) {
                    parar();
                    onDetect(ticket);
                    return;
                }
                // Leímos un código, pero no tiene el formato de un resguardo de SELAE.
                setAviso('He leído un código, pero no parece un resguardo de SELAE (¿es un décimo de Lotería Nacional o un código de barras?).');
            }
            rafRef.current = requestAnimationFrame(tick);
        };

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width:  { ideal: 1920 },   // más resolución = QR densos de resguardo legibles
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });
                if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    rafRef.current = requestAnimationFrame(tick);
                }
            } catch {
                setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
            }
        })();

        return () => { cancelado = true; parar(); };
    }, [onDetect]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
            <div className="relative w-full max-w-sm">
                <video ref={videoRef} className="w-full rounded-lg border-2 border-brand-gold" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-brand-gold/70" />
            </div>
            <p className="mt-4 max-w-sm text-center text-sm text-gray-200">
                {error || aviso || 'Enfoca el código QR del resguardo'}
            </p>
            <button
                onClick={onClose}
                className="mt-4 rounded-lg bg-brand-gold px-6 py-2 font-bold text-black hover:opacity-90"
            >
                Cancelar
            </button>
        </div>
    );
};

export default QrScanner;
