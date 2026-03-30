import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

function GoogleAnalytics() {
  const location = useLocation();
  const [gaId, setGaId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return res.text().then(text => {
            throw new Error('Expected JSON but got: ' + text.substring(0, 50));
          });
        }
        return res.json();
      })
      .then(settings => {
        if (settings.google_analytics_id) {
          setGaId(settings.google_analytics_id);
        }
      })
      .catch(err => console.error('Failed to fetch GA settings', err));
  }, []);

  useEffect(() => {
    if (gaId) {
      if (!window.gtag) {
        const script1 = document.createElement('script');
        script1.async = true;
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script1);

        const script2 = document.createElement('script');
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `;
        document.head.appendChild(script2);
      } else {
        window.gtag('config', gaId, {
          page_path: location.pathname + location.search,
        });
      }
    }
  }, [gaId, location]);

  return null;
}
import Portal from './pages/Portal';
import Admin from './pages/Admin';
import Restaurant from './pages/Restaurant';
import Customer from './pages/Customer';
import Delivery from './pages/Delivery';
import RegisterRestaurant from './pages/RegisterRestaurant';
import RegisterDelivery from './pages/RegisterDelivery';
import Marketing from './pages/Marketing';
import RestaurantProfile from './pages/RestaurantProfile';
import TrackOrder from './pages/TrackOrder';
import Contract from './pages/Contract';

import { Toaster } from 'sonner';

export default function App() {
  useEffect(() => {
    // Register Service Worker for Push Notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Only register, don't subscribe automatically on load to avoid "permission denied" errors
      // and browser blocks for non-user-gesture subscriptions.
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // If permission is already granted, we can try to refresh the subscription
          if (Notification.permission === 'granted') {
            registration.pushManager.getSubscription()
              .then(async subscription => {
                if (!subscription) {
                  try {
                    // Get public key from server
                    const res = await fetch('/api/push/key');
                    if (!res.ok) throw new Error('Failed to fetch push key');
                    const contentType = res.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                      const text = await res.text();
                      throw new Error('Expected JSON but got: ' + text.substring(0, 50));
                    }
                    const { publicKey } = await res.json();
                    
                    // Subscribe the user
                    const newSubscription = await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: urlBase64ToUint8Array(publicKey)
                    });
                    
                    // Send subscription to server
                    await fetch('/api/push/subscribe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subscription: newSubscription })
                    });
                  } catch (err) {
                    console.error('Push subscription error:', err);
                  }
                }
              });
          }
        })
        .catch(error => {
          // If we are in an iframe, this is a common issue and we should log it gracefully
          if (window.self !== window.top) {
            console.warn('Service Worker registration skipped or failed in iframe context. This is expected in some browsers. Try opening the app in a new tab for full push notification support.', error);
          } else {
            console.error('Service Worker registration failed:', error);
          }
        });
    }
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <Toaster position="top-center" richColors />
        <BrowserRouter>
          <GoogleAnalytics />
          <Routes>
          <Route path="/" element={<Customer />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/restaurant/*" element={<Restaurant />} />
          <Route path="/customer/*" element={<Customer />} />
          <Route path="/delivery/*" element={<Delivery />} />
          <Route path="/register-restaurant" element={<RegisterRestaurant />} />
          <Route path="/register-delivery" element={<RegisterDelivery />} />
          <Route path="/marketing/*" element={<Marketing />} />
          <Route path="/r/:username" element={<RestaurantProfile />} />
          <Route path="/track/:token" element={<TrackOrder />} />
          <Route path="/contract/:id" element={<Contract />} />
        </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
