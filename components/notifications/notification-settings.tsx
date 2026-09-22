"use client";

import { useEffect, useState } from "react";
import { Tape } from "@/components/visual/paper";

declare global { interface WindowEventMap { beforeinstallprompt: Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }; } }

function permissionState() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission;
}

export function NotificationSettings({ reminderCount }: { reminderCount: number }) {
  const [permission, setPermission] = useState("cargando");
  const [deviceActive, setDeviceActive] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<WindowEventMap["beforeinstallprompt"] | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPermission(permissionState());
    if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then(registration => registration?.pushManager.getSubscription()).then(subscription => setDeviceActive(Boolean(subscription)));
    const capture = (event: WindowEventMap["beforeinstallprompt"]) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function activate() {
    setMessage("");
    try {
      if (permissionState() === "unsupported") throw new Error("Este navegador no admite notificaciones web.");
      if (Notification.permission === "denied") throw new Error("No podemos activar avisos porque las notificaciones están bloqueadas en este navegador.");
      const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;
      const registration = await navigator.serviceWorker.register("/sw.js");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Las notificaciones todavía no están configuradas.");
      const raw = atob((publicKey + "=".repeat((4 - publicKey.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(Array.from(raw).map(character => character.charCodeAt(0))) });
      const response = await fetch("/api/notifications/subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error("No se pudo guardar este dispositivo.");
      setDeviceActive(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo activar."); }
  }

  async function disable() {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/notifications/subscriptions", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      await subscription.unsubscribe();
    }
    setDeviceActive(false);
  }

  async function install() {
    if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setMessage(ios ? "En Safari tocá Compartir y después ‘Agregar a pantalla de inicio’." : "Usá la opción ‘Instalar aplicación’ del menú del navegador.");
  }

  return <div className="card relative mt-8 border-t-[10px] border-t-cronopios-magenta"><Tape className="-right-4 -top-6 rotate-6" /><p className="eyebrow">Notificaciones</p><h2 className="mt-4 font-display text-2xl font-black">Avisos de agenda</h2><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="border-2 border-ink bg-cronopios-paper p-3"><dt className="font-bold">Soporte del navegador</dt><dd>{permission === "unsupported" ? "No disponible" : "Disponible"}</dd></div><div className="border-2 border-ink bg-cronopios-paper p-3"><dt className="font-bold">Permiso actual</dt><dd>{permission}</dd></div><div className="border-2 border-ink bg-cronopios-paper p-3"><dt className="font-bold">Recordatorios activos</dt><dd>{reminderCount}</dd></div><div className="border-2 border-ink bg-cronopios-paper p-3"><dt className="font-bold">Este dispositivo</dt><dd>{deviceActive ? "Activo" : "Inactivo"}</dd></div></dl>{permission === "denied" && <p className="mt-4 text-sm text-red-700">No podemos activar avisos porque las notificaciones están bloqueadas en este navegador.</p>}{message && <p className="mt-4 text-sm" role="status">{message}</p>}<div className="mt-6 flex flex-wrap gap-3"><button className="button-primary min-h-11" onClick={() => void activate()} disabled={permission === "denied" || permission === "unsupported"}>Activar en este dispositivo</button><button className="min-h-11 border-2 border-ink bg-white px-4 font-bold shadow-[2px_2px_0_0_#221E21]" onClick={() => void disable()} disabled={!deviceActive}>Desactivar en este dispositivo</button><button className="min-h-11 border-2 border-ink bg-cronopios-green px-4 font-bold shadow-[2px_2px_0_0_#221E21]" onClick={() => void install()}>Agregar Mesita a tu inicio</button></div></div>;
}
