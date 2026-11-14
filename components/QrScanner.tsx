import React, { useEffect, useMemo, useRef, useState } from 'react';
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
/** ¿El dispositivo es un móvil/tablet (cámara trasera útil para escanear)? */
const esDispositivoMovil = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const punteroGrueso = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const uaMovil = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
    return punteroGrueso || uaMovil;
};

const QrScanner: React.FC<QrScannerProps> = ({ onDetect, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cancelarRef = useRef<HTMLButtonElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    // En escritorio no abrimos la cámara de entrada: mostramos un aviso y el
    // usuario puede intentarlo igualmente (p. ej. un portátil con webcam).
    const [forzar, setForzar] = useState(false);
    const esMovil = useMemo(() => esDispositivoMovil(), []);
    const activarCamara = esMovil || forzar;

    // Cerrar con Escape y llevar el foco al botón Cancelar al abrir.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        cancelarRef.current?.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        if (!activarCamara) return;
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
    }, [onDetect, activarCamara]);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Escanear el código QR del resguardo"
        >
            {!activarCamara ? (
                /* En escritorio: aviso de usar el móvil, con opción de intentarlo igual. */
                <div className="w-full max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold/40 bg-black/40 text-brand-gold">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                            <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
                            <path strokeLinecap="round" d="M11 18.5h2" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-white">Escanea desde el móvil</h2>
                    <p className="mt-2 text-sm text-gray-300">
                        El escáner de QR está pensado para el teléfono: abre esta página en tu
                        móvil y apunta con la cámara trasera al resguardo.
                    </p>
                    <div className="mt-6 flex flex-col gap-2">
                        <button
                            onClick={() => setForzar(true)}
                            className="rounded-lg border border-brand-gold/40 bg-black/40 px-6 py-2 font-semibold text-brand-gold hover:bg-brand-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                        >
                            Intentar con la cámara de este equipo
                        </button>
                        <button
                            ref={cancelarRef}
                            onClick={onClose}
                            className="rounded-lg bg-brand-gold px-6 py-2 font-bold text-black hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="relative w-full max-w-sm">
                        <video ref={videoRef} className="w-full rounded-lg border-2 border-brand-gold" muted playsInline aria-label="Vista de la cámara" />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-brand-gold/70" aria-hidden="true" />
                    </div>
                    <p className="mt-4 max-w-sm text-center text-sm text-gray-200" role="status" aria-live="polite">
                        {error || aviso || 'Enfoca el código QR del resguardo'}
                    </p>
                    <button
                        ref={cancelarRef}
                        onClick={onClose}
                        className="mt-4 rounded-lg bg-brand-gold px-6 py-2 font-bold text-black hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        Cancelar
                    </button>
                </>
            )}
        </div>
    );
};

export default QrScanner;
