import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Restaurant from './pages/Restaurant';
import Customer from './pages/Customer';
import Delivery from './pages/Delivery';
import RegisterRestaurant from './pages/RegisterRestaurant';
import RegisterDelivery from './pages/RegisterDelivery';
import Marketing from './pages/Marketing';
import RestaurantProfile from './pages/RestaurantProfile';
import TrackOrder from './pages/TrackOrder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/restaurant/*" element={<Restaurant />} />
        <Route path="/customer/*" element={<Customer />} />
        <Route path="/delivery/*" element={<Delivery />} />
        <Route path="/register-restaurant" element={<RegisterRestaurant />} />
        <Route path="/register-delivery" element={<RegisterDelivery />} />
        <Route path="/marketing/*" element={<Marketing />} />
        <Route path="/r/:username" element={<RestaurantProfile />} />
        <Route path="/track/:token" element={<TrackOrder />} />
      </Routes>
    </BrowserRouter>
  );
}
