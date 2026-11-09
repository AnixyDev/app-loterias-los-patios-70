import React from 'react';

// URL del formulario de reserva / consulta. Se puede cambiar al compilar con
// VITE_FORM_URL; por defecto, la página del formulario de la administración.
const FORM_URL =
    (import.meta.env.VITE_FORM_URL as string | undefined) ||
    'https://loteriasmalaga70.com/formulario-html/';

/**
 * Llamada a la acción: lleva al formulario para reservar un décimo o
 * preguntar sobre los sorteos. Se abre en una pestaña nueva para no perder
 * el asistente.
 */
const ReservaCTA: React.FC = () => {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-brand-gold/30 bg-gradient-to-br from-brand-gold/10 via-black/40 to-black/60 p-6 sm:p-8 shadow-2xl shadow-black/30">
            {/* Resplandor dorado decorativo */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-brand-gold/20 blur-3xl"
            />

            <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:text-left">
                <div className="flex items-start gap-4">
                    {/* Icono */}
                    <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 bg-black/40 text-brand-gold">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                        </svg>
                    </span>

                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                            ¿Quieres reservar un décimo o tienes dudas?
                        </h2>
                        <p className="mt-1.5 text-sm sm:text-base text-gray-300">
                            Reserva tus décimos o pregúntanos lo que quieras sobre los sorteos.
                            Te responde la Administración Los Patios 70.
                        </p>
                    </div>
                </div>

                <a
                    href={FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-full bg-brand-gold px-6 py-3 text-base font-bold text-black shadow-lg shadow-brand-gold/30 transition-all duration-200 hover:brightness-110 hover:shadow-brand-gold/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                    Reservar o preguntar
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
        </section>
    );
};

export default ReservaCTA;
