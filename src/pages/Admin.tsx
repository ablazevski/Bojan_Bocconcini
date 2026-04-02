import React, { useState, useEffect, useCallback, useRef, ReactNode, Component, ErrorInfo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, Store, Activity, Check, X, MapPin, Clock, FileText, Percent, CheckCircle, LogIn, LogOut, Database, Download, Upload, Bike, Target, ChevronRight, ChevronDown, Bell, DollarSign, Settings, Save, Plus, Star, Eye, EyeOff, Trash2, Settings2, Award, Mail, Send, RefreshCw, Facebook, Instagram, Twitter, Linkedin, Globe, Phone as PhoneIcon, CreditCard, BarChart, Receipt, AlertTriangle, LayoutDashboard, Printer, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { safeFetchJson } from '../utils/api';
import LocationPickerMap from '../components/LocationPickerMap';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Настана грешка</h1>
            <p className="text-slate-600 mb-6">
              Се извинуваме, но настана неочекувана грешка во апликацијата.
            </p>
            <div className="bg-slate-50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-500">{this.state.error?.toString()}</code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Освежи ја страницата
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import DeliveryZoneMap from '../components/DeliveryZoneMap';
import { io } from 'socket.io-client';

interface PendingRestaurant {
  id: number;
  name: string;
  city: string;
  address: string;
  lat?: number;
  lng?: number;
  email: string;
  phone: string;
  bank_account: string;
  logo_url?: string;
  cover_url?: string;
  header_image?: string;
  has_own_delivery: number;
  status: string;
  working_hours: string;
  delivery_zones: string;
  spare_1: string;
  spare_2: string;
  spare_3: string;
  spare_4: string;
  username?: string;
  contract_percentage?: number;
  billing_cycle_days?: number;
  vat_rate?: number;
  delivery_fee?: number;
  min_order_amount?: number;
  password?: string;
  payment_config?: string;
  is_active?: number;
  has_admin_access?: number;
  seo_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  schema_json?: string;
}

interface DeliveryPartner {
  id: number;
  name: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  bank_account: string;
  working_hours: string;
  preferred_restaurants: string;
  status: string;
  has_signed_contract?: number;
  username?: string;
  role?: 'rider' | 'lead';
  fleet_manager_id?: number;
}

interface MarketingAssociate {
  id: number;
  username: string;
  company_name: string;
  contact_person: string;
  phone: string;
  bank_account: string;
  address: string;
  city: string;
  created_at: string;
}

interface PendingBundle {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  start_time: string;
  end_time: string;
  available_days: string;
  items: {
    menu_item_id: number;
    quantity: number;
    name: string;
    price: number;
  }[];
}

const DAYS_MAP: Record<string, string> = {
  monday: 'Понеделник', tuesday: 'Вторник', wednesday: 'Среда',
  thursday: 'Четврток', friday: 'Петок', saturday: 'Сабота', sunday: 'Недела'
};

export default function Admin() {
  return (
    <ErrorBoundary>
      <AdminContent />
    </ErrorBoundary>
  );
}

function AdminContent() {
  const navigate = useNavigate();

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    try {
      // Handle SQLite DATETIME format which might be 'YYYY-MM-DD HH:MM:SS'
      // JS Date constructor expects 'YYYY-MM-DDTHH:MM:SSZ' or similar
      const parseDate = (d: string) => {
        if (d.includes(' ')) {
          return new Date(d.replace(' ', 'T') + 'Z');
        }
        return new Date(d);
      };
      
      const startTime = parseDate(start).getTime();
      const endTime = parseDate(end).getTime();
      
      if (isNaN(startTime) || isNaN(endTime)) return '-';
      
      const diffMs = endTime - startTime;
      const diffMins = Math.round(diffMs / 60000);
      return `${diffMins} мин.`;
    } catch (e) {
      return '-';
    }
  };

  const [admin, setAdmin] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'admin',
    permissions: [] as string[]
  });
  const [newUser, setNewUser] = useState({ name: '', email: '' });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'orders' | 'delivery' | 'marketing' | 'campaigns' | 'billing' | 'settings' | 'users' | 'reviews' | 'email' | 'restaurants' | 'invoicing' | 'admins' | 'bundles'>('dashboard');
  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurant[]>([]);
  const [approvedRestaurants, setApprovedRestaurants] = useState<PendingRestaurant[]>([]);
  const [pendingBundles, setPendingBundles] = useState<PendingBundle[]>([]);
  const [allBundles, setAllBundles] = useState<any[]>([]);
  const [bundleFilterRestaurant, setBundleFilterRestaurant] = useState('');
  const [bundleFilterStartDate, setBundleFilterStartDate] = useState('');
  const [bundleFilterEndDate, setBundleFilterEndDate] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());

  const toggleInvoiceExpansion = (id: number) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInvoices(newExpanded);
  };

  const groupedInvoices = React.useMemo(() => {
    const calculations = invoices.filter(inv => inv.type === 'calculation');
    const others = invoices.filter(inv => inv.type !== 'calculation');
    
    return calculations.map(calc => ({
      ...calc,
      children: others.filter(other => other.parent_id === calc.id)
    }));
  }, [invoices]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editingInvoiceData, setEditingInvoiceData] = useState<any>(null);
  const [pendingDelivery, setPendingDelivery] = useState<DeliveryPartner[]>([]);
  const [approvedDelivery, setApprovedDelivery] = useState<DeliveryPartner[]>([]);
  const [inactiveDelivery, setInactiveDelivery] = useState<DeliveryPartner[]>([]);
  const [allDeliveryPartners, setAllDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [deliveryView, setDeliveryView] = useState<'active' | 'inactive' | 'pending'>('active');
  const [marketingAssociates, setMarketingAssociates] = useState<MarketingAssociate[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [campaignFilterDate, setCampaignFilterDate] = useState('');
  const [campaignFilterLocation, setCampaignFilterLocation] = useState('');
  const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    budget: '',
    quantity: '',
    start_date: '',
    end_date: '',
    location_type: 'all_mk',
    selected_cities: [] as string[],
    restaurant_id: '',
    cta_text: ''
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<{restaurants: any[], deliveryPartners: any[]}>({restaurants: [], deliveryPartners: []});
  const [billingStartDate, setBillingStartDate] = useState('');
  const [billingEndDate, setBillingEndDate] = useState('');
  const [orderFilterRestaurant, setOrderFilterRestaurant] = useState('');
  const [orderFilterDelivery, setOrderFilterDelivery] = useState('');
  const [orderFilterStartDate, setOrderFilterStartDate] = useState('');
  const [orderFilterEndDate, setOrderFilterEndDate] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<PendingRestaurant | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryPartner | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [isDeliveryRoleModalOpen, setIsDeliveryRoleModalOpen] = useState(false);
  const [selectedDeliveryForRole, setSelectedDeliveryForRole] = useState<DeliveryPartner | null>(null);
  const [codeFormat, setCodeFormat] = useState('--- -- ---');
  const [contractPercentage, setContractPercentage] = useState<number>(15);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [seoSettings, setSeoSettings] = useState({
    title: '',
    description: '',
    keywords: '',
    schema_json: ''
  });
  const [hasSignedContract, setHasSignedContract] = useState(false);
  
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [homeSlider, setHomeSlider] = useState<any[]>([]);
  const [isHomeSliderModalOpen, setIsHomeSliderModalOpen] = useState(false);
  const [editingSliderItem, setEditingSliderItem] = useState<any>(null);
  const [newSliderItem, setNewSliderItem] = useState({
    title: '',
    image_url: '',
    cta_text: '',
    cta_link: '',
    display_order: 0,
    is_active: 1
  });
  const [smtpSettings, setSmtpSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'false',
    smtp_from: ''
  });
  const [acelleSettings, setAcelleSettings] = useState({
    apiUrl: '',
    apiKey: '',
    listUid: ''
  });
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSyncingAcelle, setIsSyncingAcelle] = useState(false);
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
  const [invoicePeriodStart, setInvoicePeriodStart] = useState('');
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState('');
  const [selectedRestaurantForInvoice, setSelectedRestaurantForInvoice] = useState('');
  const [billingCycleDays, setBillingCycleDays] = useState<number>(7);
  const [vatRate, setVatRate] = useState<number>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [restaurantImages, setRestaurantImages] = useState({ logo_url: '', cover_url: '', header_image: '' });
  const [paymentConfig, setPaymentConfig] = useState<{
    methods: string[], 
    fees: {name: string, amount: number}[],
    loyalty_earn_percent?: number,
    loyalty_max_pay_percent?: number
  }>({
    methods: ['cash'],
    fees: [],
    loyalty_earn_percent: 5,
    loyalty_max_pay_percent: 50
  });
  const [isImporting, setIsImporting] = useState(false);
  const [staleOrderAlerts, setStaleOrderAlerts] = useState<any[]>([]);

  useEffect(() => {
    const socket = io();
    socket.emit('join_admin');

    socket.on('stale_order_alert', (alert) => {
      setStaleOrderAlerts(prev => {
        // Avoid duplicate alerts for the same order
        if (prev.some(a => a.orderId === alert.orderId)) return prev;
        return [...prev, { ...alert, id: Date.now() }];
      });
    });

    socket.on('new_order', () => {
      fetchOrders();
    });

    socket.on('order_status_changed', () => {
      fetchOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, []);
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<any>(null);
  const [usedCodes, setUsedCodes] = useState<any[]>([]);
  const [newAssociate, setNewAssociate] = useState({
    username: '',
    password: '',
    company_name: '',
    contact_person: '',
    phone: '',
    bank_account: '',
    address: '',
    city: ''
  });

  useEffect(() => {
    checkAuth();
    fetchSettings();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setAdmin(data);
          fetchData();
        } else {
          setAdmin(null);
        }
      } else {
        setAdmin(null);
      }
    } catch (e) {
      console.error('Auth check failed', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({ error: 'Невалидни податоци' }));
        setLoginError(data.error || 'Невалидни податоци');
      }
    } catch (e) {
      setLoginError('Грешка при најава');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setAdmin(null);
    navigate('/portal');
  };

  const fetchAdmins = async () => {
    if (admin?.role !== 'super') return;
    try {
      const res = await fetch('/api/admin/admins', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAdmins(data);
      }
    } catch (e) {
      console.error('Failed to fetch admins', e);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });
      if (res.ok) {
        setIsCreateAdminModalOpen(false);
        setNewAdmin({ username: '', password: '', name: '', email: '', role: 'admin', permissions: [] });
        fetchAdmins();
        alert('Администраторот е успешно креиран!');
      } else {
        const data = await res.json();
        alert(`Грешка: ${data.error || 'Неуспешно креирање'}`);
      }
    } catch (err) {
      console.error('Failed to create admin', err);
      alert('Грешка при комуникација со серверот');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setIsCreateUserModalOpen(false);
        setNewUser({ name: '', email: '' });
        fetchData();
        alert('Корисникот е успешно креиран!');
      } else {
        const data = await res.json();
        alert(`Грешка: ${data.error || 'Неуспешно креирање'}`);
      }
    } catch (err) {
      console.error('Failed to create user', err);
      alert('Грешка при комуникација со серверот');
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await safeFetchJson('/api/settings');
      setGlobalSettings(data);
      if (data.contract_percentage) setContractPercentage(Number(data.contract_percentage));
      if (data.code_format) setCodeFormat(data.code_format);
      
      setSmtpSettings({
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || '587',
        smtp_user: data.smtp_user || '',
        smtp_pass: data.smtp_pass || '',
        smtp_secure: data.smtp_secure || 'false',
        smtp_from: data.smtp_from || ''
      });

      setAcelleSettings({
        apiUrl: data.acelle_api_url || '',
        apiKey: data.acelle_api_key || '',
        listUid: data.acelle_list_uid || ''
      });
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm('Дали сте сигурни?')) return;
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAdmins();
    } catch (e) {
      console.error('Failed to delete admin', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    }
  }, [activeTab]);

  const fetchEmailData = async () => {
    try {
      const resTemplates = await fetch('/api/email/templates');
      if (resTemplates.ok) {
        const data = await resTemplates.json();
        if (Array.isArray(data)) setEmailTemplates(data);
      }
      
      const resLogs = await fetch('/api/email/logs');
      if (resLogs.ok) {
        const data = await resLogs.json();
        if (Array.isArray(data)) setEmailLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch email data', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailData();
    }
  }, [activeTab]);

  const saveGlobalSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalSettings)
      });
      if (res.ok) {
        alert('Поставките се успешно зачувани!');
      } else {
        alert('Грешка при зачувување на поставките.');
      }
    } catch (e) {
      console.error(e);
      alert('Грешка при зачувување на поставките.');
    }
    setIsSavingSettings(false);
  };

  const handleGlobalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setGlobalSettings(prev => ({ ...prev, [field]: data.url }));
    } catch (err) {
      console.error(err);
      alert('Грешка при прикачување на сликата.');
    }
  };

  useEffect(() => {
    if (admin) fetchOrders();
  }, [orderFilterRestaurant, orderFilterDelivery, orderFilterStartDate, orderFilterEndDate, admin]);

  useEffect(() => {
    if (admin) fetchAllBundles();
  }, [bundleFilterRestaurant, bundleFilterStartDate, bundleFilterEndDate, admin]);

  useEffect(() => {
    if (admin) fetchBilling();
  }, [billingStartDate, billingEndDate, admin]);

  const fetchBilling = async () => {
    try {
      const params = new URLSearchParams();
      if (billingStartDate) params.append('startDate', billingStartDate);
      if (billingEndDate) params.append('endDate', billingEndDate);
      
      const data = await safeFetchJson(`/api/admin/billing?${params.toString()}`);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setBillingData(data);
      }
    } catch (e) {
      console.error('Failed to fetch billing', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (orderFilterRestaurant) params.append('restaurantId', orderFilterRestaurant);
      if (orderFilterDelivery) params.append('deliveryPartnerId', orderFilterDelivery);
      if (orderFilterStartDate) params.append('startDate', orderFilterStartDate);
      if (orderFilterEndDate) params.append('endDate', orderFilterEndDate);
      
      const data = await safeFetchJson(`/api/admin/orders?${params.toString()}`);
      if (Array.isArray(data)) setOrders(data);
    } catch (e) {
      console.error('Failed to fetch orders', e);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await safeFetchJson('/api/admin/invoices');
      if (Array.isArray(data)) setInvoices(data);
    } catch (e) {
      console.error('Failed to fetch invoices', e);
    }
  };

  const handleClearAllInvoices = async () => {
    if (!window.confirm('Дали сте сигурни дека сакате да ги избришете сите генерирани фактури?')) return;
    try {
      const res = await fetch('/api/admin/invoices/clear-all', { method: 'POST' });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (e) {
      console.error('Failed to clear invoices', e);
    }
  };

  const fetchPendingBundles = async () => {
    try {
      const data = await safeFetchJson('/api/admin/bundles/pending');
      if (Array.isArray(data)) setPendingBundles(data);
    } catch (e) {
      console.error('Failed to fetch pending bundles', e);
    }
  };

  const fetchAllBundles = async () => {
    try {
      const params = new URLSearchParams();
      if (bundleFilterRestaurant) params.append('restaurant_id', bundleFilterRestaurant);
      if (bundleFilterStartDate) params.append('start_date', bundleFilterStartDate);
      if (bundleFilterEndDate) params.append('end_date', bundleFilterEndDate);
      
      const data = await safeFetchJson(`/api/admin/bundles?${params.toString()}`);
      if (Array.isArray(data)) setAllBundles(data);
    } catch (e) {
      console.error('Failed to fetch all bundles', e);
    }
  };

  const fetchData = async () => {
    try {
      const fetchActions = [
        safeFetchJson('/api/admin/restaurants/pending').then(data => { if (Array.isArray(data)) setPendingRestaurants(data); }),
        safeFetchJson('/api/admin/restaurants/approved').then(data => { if (Array.isArray(data)) setApprovedRestaurants(data); }),
        safeFetchJson('/api/admin/delivery/pending').then(data => { if (Array.isArray(data)) setPendingDelivery(data); }),
        safeFetchJson('/api/admin/delivery/approved').then(data => { if (Array.isArray(data)) setApprovedDelivery(data); }),
        safeFetchJson('/api/admin/delivery/inactive').then(data => { if (Array.isArray(data)) setInactiveDelivery(data); }),
        safeFetchJson('/api/admin/delivery/all').then(data => { if (Array.isArray(data)) setAllDeliveryPartners(data); }),
        safeFetchJson('/api/admin/marketing-associates').then(data => { if (Array.isArray(data)) setMarketingAssociates(data); }),
        safeFetchJson('/api/admin/campaigns').then(data => { if (Array.isArray(data)) setCampaigns(data); }),
        safeFetchJson('/api/admin/users').then(data => { if (Array.isArray(data)) setUsers(data); }),
        safeFetchJson('/api/admin/reviews').then(data => { if (Array.isArray(data)) setReviews(data); }),
        fetchOrders(),
        fetchBilling(),
        fetchInvoices(),
        fetchHomeSlider(),
        fetchPendingBundles(),
        fetchAllBundles()
      ];

      await Promise.allSettled(fetchActions);
    } catch (e) {
      console.error('Failed to fetch data', e);
    }
  };

  const fetchHomeSlider = async () => {
    try {
      const data = await safeFetchJson('/api/admin/home-slider');
      console.log('Fetched home slider:', data);
      setHomeSlider(data);
    } catch (e) {
      console.error('Failed to fetch home slider', e);
    }
  };

  const handleSaveSliderItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemToSave = editingSliderItem || newSliderItem;
    console.log('Saving slider item:', itemToSave);
    try {
      const res = await fetch('/api/admin/home-slider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToSave)
      });
      if (res.ok) {
        setIsHomeSliderModalOpen(false);
        setEditingSliderItem(null);
        setNewSliderItem({ title: '', image_url: '', cta_text: '', cta_link: '', display_order: 0, is_active: 1 });
        fetchHomeSlider();
      } else {
        const errorText = await res.text();
        console.error('Failed to save slider item:', errorText);
        alert('Грешка при зачувување на слајдот');
      }
    } catch (e) {
      console.error('Failed to save slider item', e);
      alert('Грешка при зачувување на слајдот');
    }
  };

  const handleDeleteSliderItem = async (id: number) => {
    if (!window.confirm('Дали сте сигурни дека сакате да го избришете овој слајд?')) return;
    try {
      const res = await fetch(`/api/admin/home-slider/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHomeSlider();
      }
    } catch (e) {
      console.error('Failed to delete slider item', e);
    }
  };

  const fetchUsedCodes = async (campaignId: number) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/used-codes`);
      const data = await res.json();
      setUsedCodes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openApprovalModal = (rest: PendingRestaurant) => {
    setSelectedRestaurant(rest);
    setContractPercentage(rest.contract_percentage || 15);
    setBillingCycleDays(rest.billing_cycle_days || 7);
    setVatRate(rest.vat_rate || 0);
    setDeliveryFee(rest.delivery_fee || 0);
    setMinOrderAmount(rest.min_order_amount || 0);
    setSeoSettings({
      title: rest.seo_title || '',
      description: rest.meta_description || '',
      keywords: rest.meta_keywords || '',
      schema_json: rest.schema_json || ''
    });
    setCredentials({
      username: rest.username || `rest_${rest.id}_${Math.random().toString(36).substring(2, 6)}`,
      password: rest.password || Math.random().toString(36).substring(2, 8)
    });
    setRestaurantImages({
      logo_url: rest.logo_url || '',
      cover_url: rest.cover_url || '',
      header_image: rest.header_image || ''
    });

    if (rest.payment_config) {
      try {
        const config = JSON.parse(rest.payment_config);
        setPaymentConfig({
          methods: config.methods || ['cash'],
          fees: config.fees || [],
          loyalty_earn_percent: config.loyalty_earn_percent ?? 5,
          loyalty_max_pay_percent: config.loyalty_max_pay_percent ?? 50
        });
      } catch (e) {
        setPaymentConfig({ methods: ['cash'], fees: [], loyalty_earn_percent: 5, loyalty_max_pay_percent: 50 });
      }
    } else {
      setPaymentConfig({ methods: ['cash'], fees: [], loyalty_earn_percent: 5, loyalty_max_pay_percent: 50 });
    }
  };

  const openDeliveryApprovalModal = (partner: DeliveryPartner) => {
    setSelectedDelivery(partner);
    setHasSignedContract(false);
    setCredentials({
      username: `del_${partner.id}_${Math.random().toString(36).substring(2, 6)}`,
      password: Math.random().toString(36).substring(2, 8)
    });
  };

  const toggleReviewVisibility = async (id: number) => {
    const res = await fetch(`/api/admin/reviews/${id}/toggle`, { method: 'PUT' });
    if (res.ok) {
      fetchData();
    }
  };

  const deleteReview = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да ја избришете оваа рецензија?')) return;
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    }
  };

  const handleApproveBundle = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/bundles/${id}/approve`, { 
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Пакетот е успешно одобрен!');
        fetchPendingBundles();
        fetchAllBundles();
      } else {
        toast.error('Грешка при одобрување на пакетот.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Грешка при комуникација со серверот.');
    }
  };

  const handleRejectBundle = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/bundles/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Одбиено од администратор' })
      });
      if (res.ok) {
        toast.success('Пакетот е одбиен.');
        fetchPendingBundles();
        fetchAllBundles();
      } else {
        toast.error('Грешка при одбивање на пакетот.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Грешка при комуникација со серверот.');
    }
  };

  const handleClearAllBundles = async () => {
    try {
      const res = await fetch('/api/admin/bundles/clear', { 
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Сите пакети се избришани!');
        fetchPendingBundles();
        fetchAllBundles();
      } else {
        toast.error('Грешка при бришење на пакетите.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Грешка при комуникација со серверот.');
    }
  };

  const handleSaveRestaurant = async () => {
    if (!selectedRestaurant) return;
    if (!credentials.username || !credentials.password) {
      toast.error('Внесете корисничко име и лозинка!');
      return;
    }
    
    const isUpdate = selectedRestaurant.status === 'approved';
    const url = isUpdate 
      ? `/api/admin/restaurants/${selectedRestaurant.id}`
      : `/api/admin/restaurants/${selectedRestaurant.id}/approve`;
    
    const res = await fetch(url, { 
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: selectedRestaurant.name,
        city: selectedRestaurant.city,
        address: selectedRestaurant.address,
        phone: selectedRestaurant.phone,
        email: selectedRestaurant.email,
        bank_account: selectedRestaurant.bank_account,
        lat: selectedRestaurant.lat,
        lng: selectedRestaurant.lng,
        contract_percentage: contractPercentage,
        billing_cycle_days: billingCycleDays,
        vat_rate: vatRate,
        delivery_fee: deliveryFee,
        min_order_amount: minOrderAmount,
        seo_title: seoSettings.title,
        meta_description: seoSettings.description,
        meta_keywords: seoSettings.keywords,
        schema_json: seoSettings.schema_json,
        username: credentials.username,
        password: credentials.password,
        payment_config: JSON.stringify(paymentConfig),
        logo_url: restaurantImages.logo_url,
        cover_url: restaurantImages.cover_url,
        header_image: restaurantImages.header_image,
        status: selectedRestaurant.status,
        is_active: selectedRestaurant.is_active,
        has_admin_access: selectedRestaurant.has_admin_access
      })
    });
    
    if (res.ok) {
      toast.success(isUpdate ? 'Поставките се успешно зачувани!' : 'Ресторанот е успешно одобрен!');
      setSelectedRestaurant(null);
      fetchData();
    }
  };

  const handleApproveDelivery = async () => {
    if (!selectedDelivery) return;
    if (!credentials.username || !credentials.password) {
      alert('Внесете корисничко име и лозинка!');
      return;
    }
    
    const res = await fetch(`/api/admin/delivery/${selectedDelivery.id}/approve`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: credentials.username,
        password: credentials.password,
        has_signed_contract: hasSignedContract ? 1 : 0
      })
    });
    
    if (res.ok) {
      alert('Доставувачот е успешно одобрен!');
      setSelectedDelivery(null);
      fetchData();
    }
  };

  const toggleDeliveryStatus = async (id: number) => {
    const res = await fetch(`/api/admin/delivery/${id}/toggle-status`, { method: 'POST' });
    if (res.ok) {
      fetchData();
    }
  };

  const toggleDeliveryContract = async (id: number) => {
    const res = await fetch(`/api/admin/delivery/${id}/toggle-contract`, { method: 'POST' });
    if (res.ok) {
      fetchData();
    }
  };

  const handleUpdateDeliveryRole = async (id: number, role: 'rider' | 'lead', fleetManagerId: number | null) => {
    try {
      const res = await fetch(`/api/admin/delivery/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, fleet_manager_id: fleetManagerId })
      });
      if (res.ok) {
        setIsDeliveryRoleModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да го одбиете ресторанот?')) return;
    const res = await fetch(`/api/admin/restaurants/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      if (selectedRestaurant?.id === id) setSelectedRestaurant(null);
      fetchData();
    }
  };

  const handleRejectDelivery = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да го одбиете доставувачот?')) return;
    const res = await fetch(`/api/admin/delivery/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      if (selectedDelivery?.id === id) setSelectedDelivery(null);
      fetchData();
    }
  };

  const handleCreateMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/marketing-associates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAssociate)
    });
    if (res.ok) {
      alert('Маркетинг соработникот е успешно креиран!');
      setShowMarketingModal(false);
      setNewAssociate({
        username: '',
        password: '',
        company_name: '',
        contact_person: '',
        phone: '',
        bank_account: '',
        address: '',
        city: ''
      });
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Грешка при креирање');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.budget || !newCampaign.quantity || !newCampaign.start_date || !newCampaign.end_date) {
      alert("Ве молиме пополнете ги сите задолжителни полиња.");
      return;
    }

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      });
      if (res.ok) {
        alert('Кампањата е успешно креирана!');
        setIsCreateCampaignModalOpen(false);
        setNewCampaign({
          name: '',
          description: '',
          budget: '',
          quantity: '',
          start_date: '',
          end_date: '',
          location_type: 'all_mk',
          selected_cities: [] as string[],
          restaurant_id: '',
          cta_text: ''
        });
        fetchData();
      } else {
        alert('Грешка при креирање на кампањата.');
      }
    } catch (e) {
      alert('Грешка при комуникација со серверот.');
    }
  };

  const handleApproveCampaign = async () => {
    if (!selectedCampaign) return;
    const res = await fetch(`/api/admin/campaigns/${selectedCampaign.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code_format: codeFormat })
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Кампањата е одобрена! Генерирани се ${data.generated} кодови.`);
      setSelectedCampaign(null);
      fetchData();
    } else {
      alert('Грешка при одобрување');
    }
  };

  const handleRejectCampaign = async (id: number) => {
    const res = await fetch(`/api/admin/campaigns/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      alert('Кампањата е одбиена.');
      setSelectedCampaign(null);
      fetchData();
    } else {
      alert('Грешка при одбивање на кампањата.');
    }
  };

  const loginAsOwner = async (rest: PendingRestaurant) => {
    try {
      const res = await fetch(`/api/admin/login-as-restaurant/${rest.id}`, { 
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        localStorage.setItem('restaurant_auth', JSON.stringify(rest));
        navigate('/restaurant');
      } else {
        const error = await res.json();
        alert(`Грешка при најава: ${error.message || 'Непозната грешка'}`);
      }
    } catch (error) {
      console.error('Error logging in as restaurant:', error);
      alert('Грешка при најава како ресторан');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (res.ok) {
          alert('Податоците се успешно импортирани!');
          fetchData();
        } else {
          const errData = await res.json();
          alert(`Грешка при импортирање: ${errData.error || 'Непозната грешка'}`);
        }
      } catch (err) {
        alert('Невалиден JSON фајл.');
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = ''; // Reset input
      }
    };
    reader.readAsText(file);
  };

  const renderWorkingHours = (hoursStr: string) => {
    try {
      const hours = JSON.parse(hoursStr);
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {Object.entries(hours).map(([day, data]: [string, any]) => (
            <div key={day} className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="font-medium text-slate-700">{DAYS_MAP[day] || day}</span>
              {data.active ? (
                <span className="text-emerald-600 font-medium">{data.start} - {data.end}</span>
              ) : (
                <span className="text-slate-400 italic">Не работи</span>
              )}
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return <span className="text-slate-400">Нема податоци</span>;
    }
  };

  const filteredCampaigns = campaigns.map(camp => {
    // Determine if campaign is ended
    const isEnded = camp.used_codes_count >= camp.quantity;
    return {
      ...camp,
      displayStatus: isEnded ? 'ended' : camp.status
    };
  }).filter(camp => {
    let match = true;
    if (campaignFilterDate) {
      const campStart = new Date(camp.start_date).getTime();
      const campEnd = new Date(camp.end_date).getTime();
      const filterTime = new Date(campaignFilterDate).getTime();
      if (filterTime < campStart || filterTime > campEnd) match = false;
    }
    if (campaignFilterLocation) {
      if (camp.location_type === 'all_mk' && campaignFilterLocation !== 'all_mk') match = false;
      if (camp.location_type === 'cities' && !camp.selected_cities.includes(campaignFilterLocation)) match = false;
    }
    return match;
  });

  const handleUpdateInvoiceStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchInvoices();
        setIsInvoiceModalOpen(false);
        setSelectedInvoice(null);
      }
    } catch (e) {
      console.error('Failed to update invoice status', e);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedRestaurantForInvoice) {
      alert('Ве молиме изберете ресторан.');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/invoices/generate-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          restaurant_id: selectedRestaurantForInvoice,
          period_start: invoicePeriodStart,
          period_end: invoicePeriodEnd
        })
      });
      
      if (res.ok) {
        toast.success('Пресметката е успешно генерирана и испратена до ресторанот!');
        setShowGenerateInvoiceModal(false);
        setSelectedRestaurantForInvoice('');
        setInvoicePeriodStart('');
        setInvoicePeriodEnd('');
        fetchInvoices();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Грешка при генерирање на фактура.');
      }
    } catch (e) {
      toast.error('Грешка при комуникација со серверот.');
    }
  };

  const handleGenerateDemoInvoice = async (rid: string) => {
    try {
      const res = await fetch('/api/admin/test/insert-demo-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          restaurant_id: rid
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`ДЕМО ПРЕСМЕТКА #${data.invoice_number} е успешно генерирана!`);
        fetchInvoices();
      } else {
        const data = await res.json();
        alert(`Грешка: ${data.error || 'Неуспешно генерирање демо'}`);
      }
    } catch (error) {
      console.error('Failed to generate demo invoice', error);
      alert('Грешка при поврзување со серверот.');
    }
  };

  const viewInvoice = async (invoice: any) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        setSelectedInvoice(await res.json());
        setIsInvoiceModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to fetch invoice details', e);
    }
  };

  const handleApproveInvoice = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да ја одобрите оваа фактура?')) return;
    try {
      const res = await fetch(`/api/admin/invoices/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchInvoices();
      } else {
        alert('Грешка при одобрување на фактурата.');
      }
    } catch (e) {
      alert('Грешка при комуникација со серверот.');
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да ја избришете оваа фактура?')) return;
    console.log(`[DEBUG] Attempting to delete invoice ID: ${id}`);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Фактурата е успешно избришана.');
        fetchInvoices();
      } else {
        const data = await res.json();
        console.error('[DEBUG] Delete failed:', data);
        toast.error(data.error || 'Грешка при бришење на фактурата.');
      }
    } catch (e) {
      console.error('[DEBUG] Delete error:', e);
      toast.error('Грешка при комуникација со серверот.');
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingInvoiceData)
      });
      if (res.ok) {
        fetchInvoices();
        setIsEditingInvoice(false);
        setSelectedInvoice(null);
      }
    } catch (e) {
      console.error('Failed to update invoice', e);
    }
  };

  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-emerald-600 p-8 text-white text-center">
            <Settings className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Админ Панел</h1>
            <p className="opacity-80">Најавете се за да продолжите</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Корисничко име</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={loginForm.username}
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Лозинка</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Најави се
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Или</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.href = '/api/auth/google'}
              className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Најави се со Google
            </button>

            <Link to="/portal" className="block text-center text-sm text-slate-500 hover:text-emerald-600 transition-colors">
              Назад кон порталот
            </Link>
          </form>
        </div>
      </div>
    );
  }

  const hasPermission = (p: string) => {
    if (!admin) return false;
    if (admin.role === 'super') return true;
    
    let permissions = admin.permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (e) {
        permissions = [];
      }
    }
    
    return Array.isArray(permissions) && permissions.includes(p);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800 flex-shrink-0">Админ Панел</h1>
          <div className="flex bg-slate-100 p-1 rounded-lg ml-4 overflow-x-auto scrollbar-hide">
            {hasPermission('dashboard') && (
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`relative px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutDashboard size={14} />
                Дашборд
              </button>
            )}
            {hasPermission('restaurants') && (
              <button 
                onClick={() => setActiveTab('restaurants')}
                className={`relative px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'restaurants' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Store size={14} />
                Ресторани
                {pendingRestaurants.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full border border-slate-50">
                    {pendingRestaurants.length}
                  </span>
                )}
              </button>
            )}
            {hasPermission('restaurants') && (
              <button 
                onClick={() => setActiveTab('bundles')}
                className={`relative px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'bundles' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Award size={14} />
                Пакети
                {pendingBundles.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full border border-slate-50">
                    {pendingBundles.length}
                  </span>
                )}
              </button>
            )}
            {hasPermission('database') && (
              <button 
                onClick={() => setActiveTab('database')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'database' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Database size={14} />
                База
              </button>
            )}
            {hasPermission('orders') && (
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'orders' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileText size={14} />
                Нарачки
              </button>
            )}
            {hasPermission('invoicing') && (
              <button 
                onClick={() => setActiveTab('invoicing')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'invoicing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Receipt size={14} />
                Фактури
              </button>
            )}
            {hasPermission('delivery') && (
              <button 
                onClick={() => setActiveTab('delivery')}
                className={`relative px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'delivery' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Bike size={14} />
                Достава
                {pendingDelivery.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full border border-slate-50">
                    {pendingDelivery.length}
                  </span>
                )}
              </button>
            )}
            {hasPermission('marketing') && (
              <button 
                onClick={() => setActiveTab('marketing')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'marketing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={14} />
                Маркетинг
              </button>
            )}
            {hasPermission('campaigns') && (
              <button 
                onClick={() => setActiveTab('campaigns')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'campaigns' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Target size={14} />
                Кампањи
              </button>
            )}
            {hasPermission('billing') && (
              <button 
                onClick={() => setActiveTab('billing')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'billing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <DollarSign size={14} />
                Исплати
              </button>
            )}
            {hasPermission('users') && (
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={14} />
                Корисници
              </button>
            )}
            {hasPermission('reviews') && (
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'reviews' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Star size={14} />
                Рецензии
              </button>
            )}
            {hasPermission('settings') && (
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Settings size={14} />
                Поставки
              </button>
            )}
            {hasPermission('email') && (
              <button 
                onClick={() => setActiveTab('email')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Mail size={14} />
                Е-маил
              </button>
            )}
            {hasPermission('admins') && (
              <button 
                onClick={() => setActiveTab('admins')}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${activeTab === 'admins' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Award size={14} />
                Админи
              </button>
            )}
            <Link 
              to="/marketing"
              className="px-3 py-1.5 rounded-md text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors flex flex-col items-center gap-0.5 min-w-[80px] border border-indigo-100 ml-2"
            >
              <LogIn size={14} />
              Маркетинг
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-700">{admin.name}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{admin.role}</span>
          </div>
          <div className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-medium">
            {admin.name?.charAt(0) || 'A'}
          </div>
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Одјави се"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-6">
        {staleOrderAlerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {staleOrderAlerts.map(alert => (
              <div key={alert.id} className="bg-red-50 border-l-4 border-red-500 p-4 flex justify-between items-center animate-pulse shadow-sm rounded-r-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-full">
                    <Clock className="text-red-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800 uppercase tracking-tight">
                      {alert.isReassignment ? 'ПРЕРАСПОРЕДЕНА НАРАЧКА' : 'КРИТИЧНА НАРАЧКА'} #{alert.orderId}
                    </p>
                    <p className="text-xs text-red-600 font-medium">
                      Ресторан: <span className="font-bold">{alert.restaurant}</span> — Храната чека веќе <span className="font-bold underline">{alert.elapsed} минути</span>!
                      {alert.isReassignment && alert.prevPartner && (
                        <span className="block mt-1 text-[10px] opacity-80 italic">
                          * Доставувачот {alert.prevPartner} не ја подигна навреме. Нарачката е вратена како слободна.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setStaleOrderAlerts(prev => prev.filter(a => a.id !== alert.id))}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-400 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Активни нарачки</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {orders.filter(o => ['pending', 'accepted', 'delivering'].includes(o.status)).length}
                </h3>
              </div>
              <div 
                onClick={() => {
                  if (pendingRestaurants.length > 0) setActiveTab('restaurants');
                  else if (pendingDelivery.length > 0) setActiveTab('delivery');
                }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Чекаат одобрување</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {pendingRestaurants.length + pendingDelivery.length}
                </h3>
              </div>
              <div 
                onClick={() => setActiveTab('restaurants')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Вкупно ресторани</p>
                <h3 className="text-3xl font-bold text-slate-800">{approvedRestaurants.length}</h3>
              </div>
              <div 
                onClick={() => setActiveTab('delivery')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Вкупно доставувачи</p>
                <h3 className="text-3xl font-bold text-slate-800">{approvedDelivery.length}</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="text-blue-500" size={20} />
                  Активни нарачки во реално време
                </h3>
                <span className="text-xs font-bold text-slate-400 uppercase">Во живо</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ресторан</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Клиент</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Доставувач</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Вкупно</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Акција</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.filter(o => ['pending', 'accepted', 'delivering'].includes(o.status)).map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-800">#{order.id}</td>
                        <td className="p-4 text-sm text-slate-600">
                          {approvedRestaurants.find(r => r.id === order.restaurant_id)?.name || `ID: ${order.restaurant_id}`}
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{order.delivery_address}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'delivering' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {order.status === 'pending' ? 'Чека одобрување' :
                             order.status === 'accepted' ? 'Се подготвува' :
                             order.status === 'delivering' ? 'Во достава' : order.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {order.delivery_partner_name || <span className="text-slate-300 italic">Не е доделен</span>}
                        </td>
                        <td className="p-4 text-sm font-bold text-slate-800">{order.total_price} ден.</td>
                        <td className="p-4">
                          <Link 
                            to={`/track/${order.tracking_token}`} 
                            target="_blank"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                            title="Следи во живо"
                          >
                            <Target size={18} />
                          </Link>
                          <button 
                            onClick={() => {
                              const rest = approvedRestaurants.find(r => r.id === order.restaurant_id);
                              if (rest) loginAsOwner(rest);
                            }}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors inline-block ml-2"
                            title="Најави се како ресторан"
                          >
                            <LogIn size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.filter(o => ['pending', 'accepted', 'delivering'].includes(o.status)).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          Моментално нема активни нарачки.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'invoicing' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Фактурирање</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowGenerateInvoiceModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Генерирај Нова
                </button>
                <button 
                  onClick={handleClearAllInvoices}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                  title="Избриши ги сите фактури"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={fetchInvoices}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Освежи"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Број</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Тип</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ресторан</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Период</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Износ</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Статус</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Акции</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupedInvoices.map((calc) => (
                      <React.Fragment key={calc.id}>
                        <tr className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 font-medium text-slate-700 flex items-center gap-2">
                            {calc.children.length > 0 && (
                              <button 
                                onClick={() => toggleInvoiceExpansion(calc.id)}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                              >
                                {expandedInvoices.has(calc.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            )}
                            #{calc.invoice_number}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                              Пресметка
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">{calc.restaurant_name}</td>
                          <td className="p-4 text-slate-600">
                            {new Date(calc.period_start).toLocaleDateString('mk-MK')} - {new Date(calc.period_end).toLocaleDateString('mk-MK')}
                          </td>
                          <td className="p-4 font-bold text-blue-700">{calc.total_amount.toLocaleString()} ден.</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              calc.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                              calc.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                              calc.status === 'Pending Approval' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {calc.status === 'Paid' ? 'Платена' :
                               calc.status === 'Approved' ? 'Одобрена' :
                               calc.status === 'Pending Approval' ? 'Чека одобрување' :
                               'Нацрт'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => viewInvoice(calc)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="Прегледај"
                              >
                                <Eye size={18} />
                              </button>
                              {calc.status === 'Draft' && (
                                <button 
                                  onClick={() => handleUpdateInvoiceStatus(calc.id, 'Pending')}
                                  className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                  title="Извести ресторан"
                                >
                                  <Send size={18} />
                                </button>
                              )}
                              {(calc.status === 'Draft' || calc.status === 'Pending') && (
                                <button 
                                  onClick={() => handleApproveInvoice(calc.id)}
                                  className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                  title="Одобри"
                                >
                                  <Check size={18} />
                                </button>
                              )}
                              {calc.status === 'Approved' && (
                                <button 
                                  onClick={() => handleUpdateInvoiceStatus(calc.id, 'Paid')}
                                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                  title="Означи како платена"
                                >
                                  <DollarSign size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedInvoice(calc);
                                  setEditingInvoiceData({
                                    invoice_number: calc.invoice_number,
                                    total_amount: calc.total_amount,
                                    commission_amount: calc.commission_amount,
                                    net_amount: calc.net_amount,
                                    vat_amount: calc.vat_amount,
                                    base_amount: calc.base_amount,
                                    status: calc.status
                                  });
                                  setIsEditingInvoice(true);
                                }}
                                className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                title="Измени"
                              >
                                <Settings2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteInvoice(calc.id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Избриши"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedInvoices.has(calc.id) && calc.children.map((child: any) => (
                          <tr key={child.id} className="bg-slate-50/50 border-l-4 border-indigo-500 transition-colors">
                            <td className="p-4 pl-12 font-medium text-slate-600">#{child.invoice_number}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                child.type === 'invoice' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {child.type === 'invoice' ? 'Фактура' : (child.type === 'compensation' || child.type === 'КОМПЕНЗАЦИЈА') ? 'КОМПЕНЗАЦИЈА' : 'Провизија'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500">{child.restaurant_name}</td>
                            <td className="p-4 text-slate-500">
                              {new Date(child.period_start).toLocaleDateString('mk-MK')} - {new Date(child.period_end).toLocaleDateString('mk-MK')}
                            </td>
                            <td className="p-4 font-bold text-slate-700">{child.total_amount.toLocaleString()} ден.</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                child.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                child.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {child.status === 'Paid' ? 'Платена' :
                                 child.status === 'Approved' ? 'Одобрена' :
                                 'Нацрт'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => viewInvoice(child)}
                                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                  title="Прегледај"
                                >
                                  <Eye size={18} />
                                </button>
                                {child.status === 'Approved' && (
                                  <button 
                                    onClick={() => handleUpdateInvoiceStatus(child.id, 'Paid')}
                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                    title="Означи како платена"
                                  >
                                    <DollarSign size={18} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteInvoice(child.id)}
                                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                  title="Избриши"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                          Нема пронајдено фактури.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'database' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-2xl mx-auto mt-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Управување со податоци</h2>
              <p className="text-slate-500">
                Експортирајте ја целата база на податоци (ресторани, мени, зони, нарачки) како бекап, или импортирајте претходно зачуван фајл за да ги вратите податоците.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors">
                <Download size={32} className="mx-auto text-slate-400 mb-4" />
                <h3 className="font-bold text-slate-800 mb-2">Експортирај (Бекап)</h3>
                <p className="text-sm text-slate-500 mb-6">Симнете ги сите податоци во JSON формат на вашиот компјутер.</p>
                <a 
                  href="/api/admin/export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Експортирај
                </a>
              </div>

              <div className="border border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors relative">
                <Upload size={32} className="mx-auto text-slate-400 mb-4" />
                <h3 className="font-bold text-slate-800 mb-2">Импортирај (Врати)</h3>
                <p className="text-sm text-slate-500 mb-6">Вратете ги податоците од претходно зачуван JSON фајл.</p>
                
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport} 
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                />
                <button 
                  disabled={isImporting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 pointer-events-none"
                >
                  {isImporting ? 'Се вчитува...' : <><Upload size={18} /> Импортирај</>}
                </button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
              <strong>Внимание:</strong> Импортирањето на нов фајл целосно ќе ги избрише моменталните податоци во системот и ќе ги замени со тие од фајлот.
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="text-blue-500" />
              Сите нарачки
            </h2>
            
            <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ресторан</label>
                <select 
                  value={orderFilterRestaurant}
                  onChange={(e) => setOrderFilterRestaurant(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Сите ресторани</option>
                  {approvedRestaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Доставувач</label>
                <select 
                  value={orderFilterDelivery}
                  onChange={(e) => setOrderFilterDelivery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Сите доставувачи</option>
                  {approvedDelivery.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Од датум</label>
                <input 
                  type="date"
                  value={orderFilterStartDate}
                  onChange={(e) => setOrderFilterStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">До датум</label>
                <input 
                  type="date"
                  value={orderFilterEndDate}
                  onChange={(e) => setOrderFilterEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Клиент</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ресторан</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Доставувач</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Вкупно</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Код</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Време</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Следење</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800">#{order.id}</td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                        <p className="text-xs text-slate-500">{order.delivery_address}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {approvedRestaurants.find(r => r.id === order.restaurant_id)?.name || `ID: ${order.restaurant_id}`}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {order.delivery_partner_name || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'delivering' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{order.total_price} ден.</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {order.payment_method === 'cash' ? 'Готовина' : order.payment_method === 'card' ? 'Картичка' : 'Поени'}
                        </p>
                      </td>
                      <td className="p-4">
                        {order.delivery_code ? (
                          <div className="text-[10px] font-mono bg-slate-100 p-1 rounded max-w-[150px] truncate" title={order.delivery_code}>
                            {order.delivery_code}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-700" title="Вкупно време од нарачка до достава">
                            <Clock size={12} className="text-slate-400" />
                            {formatDuration(order.created_at, order.delivered_at)}
                          </div>
                          <div className="flex flex-col text-[9px] text-slate-400 leading-tight">
                            {order.accepted_at && (
                              <span>Примена: {formatDuration(order.created_at, order.accepted_at)}</span>
                            )}
                            {order.ready_at && order.accepted_at && (
                              <span>Подготовка: {formatDuration(order.accepted_at, order.ready_at)}</span>
                            )}
                            {order.delivered_at && order.picked_up_at && (
                              <span>Достава: {formatDuration(order.picked_up_at, order.delivered_at)}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {order.tracking_token ? (
                          <Link 
                            to={`/track/${order.tracking_token}`} 
                            target="_blank"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Target size={18} />
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="p-12 text-center text-slate-400">Нема пронајдено нарачки.</div>
              )}
            </div>
          </div>
        ) : activeTab === 'marketing' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-indigo-500" />
                Маркетинг Соработници
              </h2>
              <button 
                onClick={() => setShowMarketingModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <LogIn size={18} />
                Креирај Соработник
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Компанија</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Контакт</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Град</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Корисничко име</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Датум</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {marketingAssociates.map(assoc => (
                    <tr key={assoc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{assoc.company_name}</p>
                        <p className="text-xs text-slate-500">{assoc.address}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-slate-800">{assoc.contact_person}</p>
                        <p className="text-xs text-slate-500">{assoc.phone}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{assoc.city}</td>
                      <td className="p-4 text-sm font-mono text-indigo-600">{assoc.username}</td>
                      <td className="p-4 text-xs text-slate-400">{new Date(assoc.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {marketingAssociates.length === 0 && (
                <div className="p-12 text-center text-slate-400">Нема креирано маркетинг соработници.</div>
              )}
            </div>
          </div>
        ) : activeTab === 'campaigns' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Target className="text-indigo-500" />
                Маркетинг Кампањи
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsCreateCampaignModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Нова Кампања
                </button>
                <input 
                  type="date" 
                  value={campaignFilterDate}
                  onChange={e => setCampaignFilterDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={campaignFilterLocation}
                  onChange={e => setCampaignFilterLocation(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Сите локации</option>
                  <option value="all_mk">Цела МК</option>
                  <option value="Скопје">Скопје</option>
                  <option value="Битола">Битола</option>
                  <option value="Охрид">Охрид</option>
                  <option value="Тетово">Тетово</option>
                  <option value="Куманово">Куманово</option>
                </select>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Кампања</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Соработник</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Попуст</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Период</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Локација</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCampaigns.map(camp => (
                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => camp.displayStatus === 'pending' && setSelectedCampaign(camp)}>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{camp.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{camp.description}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {camp.restaurant_name ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {camp.restaurant_name}
                          </span>
                        ) : (
                          camp.associate_name || 'Админ'
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{camp.budget} ден.</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{camp.quantity} кодови</p>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {camp.location_type === 'all_mk' ? 'Цела МК' :
                         camp.location_type === 'cities' ? `${JSON.parse(camp.selected_cities).length} градови` :
                         'Мапирани зони'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            camp.displayStatus === 'pending' ? 'bg-orange-100 text-orange-700' :
                            camp.displayStatus === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            camp.displayStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                            camp.displayStatus === 'ended' ? 'bg-slate-200 text-slate-600' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {camp.displayStatus === 'pending' ? 'Pending' : camp.displayStatus}
                          </span>
                          {camp.displayStatus === 'pending' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectCampaign(camp.id);
                              }}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Одбиј кампања"
                            >
                              <X size={14} />
                            </button>
                          )}
                          {camp.status === 'active' && (
                            <>
                              <a 
                                href={`/api/campaigns/${camp.id}/export`}
                                download
                                onClick={e => e.stopPropagation()}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                title="Превземи кодови"
                              >
                                <Download size={14} />
                              </a>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampaignForDetails(camp);
                                  fetchUsedCodes(camp.id);
                                }}
                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Детали за искористени кодови"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {campaigns.length === 0 && (
                <div className="p-12 text-center text-slate-400">Нема активни кампањи.</div>
              )}
            </div>
          </div>
        ) : activeTab === 'billing' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <DollarSign className="text-emerald-500" />
              Исплати и Пресметки
            </h2>
            
            <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Од датум</label>
                <input 
                  type="date" 
                  value={billingStartDate}
                  onChange={(e) => setBillingStartDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">До датум</label>
                <input 
                  type="date" 
                  value={billingEndDate}
                  onChange={(e) => setBillingEndDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Restaurants Billing */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Store size={18} className="text-blue-500" />
                    Ресторани
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ресторан</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Нарачки</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Промет</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Провизија</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">За исплата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingData.restaurants.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{r.name}</td>
                          <td className="p-4 text-slate-600">{r.totalOrders}</td>
                          <td className="p-4 text-slate-600">{r.totalRevenue.toLocaleString()} ден.</td>
                          <td className="p-4 text-red-600">{r.platformFee.toLocaleString()} ден. ({r.contract_percentage}%)</td>
                          <td className="p-4 font-bold text-emerald-600">{r.netPayout.toLocaleString()} ден.</td>
                        </tr>
                      ))}
                      {billingData.restaurants.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">Нема податоци за избраниот период</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Partners Billing */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Bike size={18} className="text-orange-500" />
                    Доставувачи
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Доставувач</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Достави</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Цена по достава</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">За исплата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingData.deliveryPartners.map((dp: any) => (
                        <tr key={dp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{dp.name}</td>
                          <td className="p-4 text-slate-600">{dp.totalDeliveries}</td>
                          <td className="p-4 text-slate-600">{dp.feePerDelivery} ден.</td>
                          <td className="p-4 font-bold text-emerald-600">{dp.netPayout.toLocaleString()} ден.</td>
                        </tr>
                      ))}
                      {billingData.deliveryPartners.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500">Нема податоци за избраниот период</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'delivery' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setDeliveryView('active')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${deliveryView === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Активни
                </button>
                <button
                  onClick={() => setDeliveryView('inactive')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${deliveryView === 'inactive' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Неактивни
                </button>
              </div>
              <button
                onClick={() => setDeliveryView('pending')}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${deliveryView === 'pending' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Bell size={18} className={pendingDelivery.length > 0 ? 'text-emerald-500' : 'text-slate-400'} />
                Барања
                {pendingDelivery.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                    {pendingDelivery.length}
                  </span>
                )}
              </button>
            </div>

            {deliveryView === 'pending' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Bike className="text-emerald-500" />
                  Барања за нови доставувачи
                </h2>
                
                {pendingDelivery.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>Нема нови барања за доставувачи.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDelivery.map(partner => (
                      <div key={partner.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-emerald-300 transition-colors cursor-pointer" onClick={() => openDeliveryApprovalModal(partner)}>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{partner.name}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {partner.address}, {partner.city}</span>
                            <span>📧 {partner.email}</span>
                            <span>📞 {partner.phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <button onClick={() => openDeliveryApprovalModal(partner)} className="flex-1 md:flex-none bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                            <FileText size={18} /> Прегледај
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {deliveryView === 'active' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CheckCircle className="text-emerald-500" />
                  Активни доставувачи
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                    {approvedDelivery.length}
                  </span>
                </h2>
                
                {approvedDelivery.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>Нема активни доставувачи.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedDelivery.map(partner => (
                      <div key={partner.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-emerald-300 transition-colors">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{partner.name}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {partner.address}, {partner.city}</span>
                            <span>👤 {partner.username}</span>
                            {partner.has_signed_contract === 1 && <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={14} /> Потпишан договор</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleDeliveryContract(partner.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${partner.has_signed_contract === 1 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={partner.has_signed_contract === 1 ? 'Договорот е потпишан' : 'Означи како потпишан договор'}
                          >
                            <FileText size={16} />
                            {partner.has_signed_contract === 1 ? 'Потпишан' : 'Потпиши'}
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedDeliveryForRole(partner);
                              setIsDeliveryRoleModalOpen(true);
                            }}
                            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2"
                            title="Управувај со улога"
                          >
                            <Settings2 size={16} /> Управувај
                          </button>
                          <button 
                            onClick={() => toggleDeliveryStatus(partner.id)}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            Деактивирај
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {deliveryView === 'inactive' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <X className="text-red-500" />
                  Неактивни доставувачи
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                    {inactiveDelivery.length}
                  </span>
                </h2>
                
                {inactiveDelivery.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>Нема неактивни доставувачи.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inactiveDelivery.map(partner => (
                      <div key={partner.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-red-300 transition-colors">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{partner.name}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {partner.address}, {partner.city}</span>
                            <span>👤 {partner.username}</span>
                            {partner.has_signed_contract === 1 && <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={14} /> Потпишан договор</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleDeliveryContract(partner.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${partner.has_signed_contract === 1 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={partner.has_signed_contract === 1 ? 'Договорот е потпишан' : 'Означи како потпишан договор'}
                          >
                            <FileText size={16} />
                            {partner.has_signed_contract === 1 ? 'Потпишан' : 'Потпиши'}
                          </button>
                          <button 
                            onClick={() => toggleDeliveryStatus(partner.id)}
                            className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            Активирај
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="p-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-800">Регистрирани Корисници</h2>
                  <div className="text-sm text-slate-500">Вкупно: {users.length}</div>
                </div>
                <button 
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <UserPlus size={18} />
                  Нов Корисник
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Корисник</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Лојалност Поени</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Регистриран</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {user.name?.[0] || 'U'}
                            </div>
                            <span className="font-bold text-slate-800">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{user.email}</td>
                        <td className="p-4">
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold text-sm">
                            {user.loyalty_points || 0} поени
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'reviews' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Star className="text-amber-500" />
              Управување со Рецензии
            </h2>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ресторан</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Клиент</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Оцена</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Коментар</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Датум</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Акции</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reviews.map(review => (
                    <tr key={review.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800">{review.restaurant_name}</td>
                      <td className="p-4 text-sm text-slate-600">{review.customer_name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-500 max-w-xs truncate" title={review.comment}>
                        {review.comment}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${review.is_visible ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {review.is_visible ? 'Видливо' : 'Скриено'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => toggleReviewVisibility(review.id)}
                            className={`p-2 rounded-lg transition-colors ${review.is_visible ? 'text-slate-400 hover:bg-slate-100' : 'text-indigo-600 hover:bg-indigo-50'}`}
                            title={review.is_visible ? "Скриј" : "Прикажи"}
                          >
                            {review.is_visible ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                          <button 
                            onClick={() => deleteReview(review.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Избриши"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reviews.length === 0 && (
                <div className="p-12 text-center text-slate-400">Нема пронајдено рецензии.</div>
              )}
            </div>
          </div>
        ) : activeTab === 'email' ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Mail className="text-indigo-600" />
                Е-маил Поставки и Маркетинг
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* SMTP Settings */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Settings2 className="text-indigo-500" />
                  SMTP Конфигурација
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Host</label>
                      <input 
                        type="text" 
                        value={smtpSettings.smtp_host || ''}
                        onChange={e => setSmtpSettings({...smtpSettings, smtp_host: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Port</label>
                      <input 
                        type="text" 
                        value={smtpSettings.smtp_port || ''}
                        onChange={e => setSmtpSettings({...smtpSettings, smtp_port: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="587"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">User</label>
                      <input 
                        type="text" 
                        value={smtpSettings.smtp_user || ''}
                        onChange={e => setSmtpSettings({...smtpSettings, smtp_user: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pass</label>
                      <input 
                        type="password" 
                        value={smtpSettings.smtp_pass}
                        onChange={e => setSmtpSettings({...smtpSettings, smtp_pass: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">From Email</label>
                      <input 
                        type="text" 
                        value={smtpSettings.smtp_from}
                        onChange={e => setSmtpSettings({...smtpSettings, smtp_from: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="noreply@pizzatime.mk"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secure (SSL/TLS)</label>
                      <select 
                        value={smtpSettings.smtp_secure}
                        onChange={e => setSmtpSettings({...smtpSettings, smtp_secure: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="false">Не (STARTTLS)</option>
                        <option value="true">Да (SSL/TLS)</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={() => {
                        fetch('/api/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(smtpSettings)
                        })
                        .then(res => {
                          if (res.ok) alert('SMTP поставките се зачувани!');
                          else alert('Грешка при зачувување на поставките.');
                        })
                        .catch(err => {
                          console.error('Failed to save SMTP settings', err);
                          alert('Грешка при комуникација со серверот.');
                        });
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={18} /> Зачувај
                    </button>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">Тестирај SMTP</h4>
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Внесете е-маил за тест"
                    />
                    <button 
                      onClick={() => {
                        if (!testRecipient) return alert('Внесете е-маил!');
                        setIsSendingTest(true);
                        fetch('/api/email/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            recipient: testRecipient,
                            host: smtpSettings.smtp_host,
                            port: smtpSettings.smtp_port,
                            user: smtpSettings.smtp_user,
                            pass: smtpSettings.smtp_pass,
                            secure: smtpSettings.smtp_secure,
                            from: smtpSettings.smtp_from
                          })
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) alert('Тест е-маилот е успешно испратен!');
                          else alert('Грешка: ' + data.message);
                        })
                        .catch(err => {
                          console.error('Failed to send test email', err);
                          alert('Грешка при комуникација со серверот.');
                        })
                        .finally(() => setIsSendingTest(false));
                      }}
                      disabled={isSendingTest}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 rounded-xl transition-all flex items-center gap-2"
                    >
                      {isSendingTest ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                      Тест
                    </button>
                  </div>
                </div>
              </div>

              {/* Acelle Mail Sync */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <RefreshCw className="text-emerald-500" />
                  Acelle Mail Синхронизација
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">API URL</label>
                    <input 
                      type="text" 
                      value={acelleSettings.apiUrl || ''}
                      onChange={e => setAcelleSettings({...acelleSettings, apiUrl: e.target.value})}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="https://acelle.yourdomain.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Key</label>
                    <input 
                      type="password" 
                      value={acelleSettings.apiKey || ''}
                      onChange={e => setAcelleSettings({...acelleSettings, apiKey: e.target.value})}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">List UID</label>
                    <input 
                      type="text" 
                      value={acelleSettings.listUid}
                      onChange={e => setAcelleSettings({...acelleSettings, listUid: e.target.value})}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="65f23a..."
                    />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={() => {
                        fetch('/api/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            acelle_api_url: acelleSettings.apiUrl,
                            acelle_api_key: acelleSettings.apiKey,
                            acelle_list_uid: acelleSettings.listUid
                          })
                        })
                        .then(res => {
                          if (res.ok) alert('Acelle поставките се зачувани!');
                          else alert('Грешка при зачувување на поставките.');
                        })
                        .catch(err => {
                          console.error('Failed to save Acelle settings', err);
                          alert('Грешка при комуникација со серверот.');
                        });
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={18} /> Зачувај
                    </button>
                    <button 
                      onClick={() => {
                        if (!acelleSettings.apiUrl || !acelleSettings.apiKey || !acelleSettings.listUid) return alert('Пополнете ги сите полиња за Acelle!');
                        setIsSyncingAcelle(true);
                        fetch('/api/email/acelle-sync', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(acelleSettings)
                        })
                        .then(res => res.json())
                        .then(data => {
                          alert(`Синхронизацијата заврши! Успешни: ${data.successCount}, Неуспешни: ${data.failCount}`);
                        })
                        .catch(err => {
                          console.error('Failed to sync Acelle', err);
                          alert('Грешка при комуникација со серверот.');
                        })
                        .finally(() => setIsSyncingAcelle(false));
                      }}
                      disabled={isSyncingAcelle}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {isSyncingAcelle ? <RefreshCw size={18} className="animate-spin" /> : <Database size={18} />}
                      Синхронизирај Корисници
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Templates */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="text-indigo-500" />
                Шаблони за Е-маил
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {emailTemplates.map(template => (
                  <div key={template.id} className="border border-slate-100 rounded-2xl p-6 hover:border-indigo-200 transition-all bg-slate-50/50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-800">{template.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                    <button 
                      onClick={() => setSelectedTemplate(template)}
                      className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                    >
                      Уреди Шаблон
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Logs */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Activity className="text-orange-500" />
                Дневник на испратени е-маилови
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="pb-4 pr-4">Време</th>
                      <th className="pb-4 pr-4">Шаблон</th>
                      <th className="pb-4 pr-4">Примач</th>
                      <th className="pb-4 pr-4">Тема</th>
                      <th className="pb-4">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {emailLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-4 pr-4 text-slate-500">{new Date(log.sent_at).toLocaleString()}</td>
                        <td className="py-4 pr-4 font-medium text-slate-700">{log.template_name}</td>
                        <td className="py-4 pr-4 text-slate-600">{log.recipient}</td>
                        <td className="py-4 pr-4 text-slate-600 truncate max-w-xs">{log.subject}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                          {log.error && <p className="text-[10px] text-red-400 mt-1">{log.error}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Template Edit Modal */}
            {selectedTemplate && (
              <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="bg-indigo-600 p-6 text-white flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold">Уреди Шаблон: {selectedTemplate.name}</h2>
                    <button onClick={() => setSelectedTemplate(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Достапни променливи</h4>
                      <div className="flex flex-wrap gap-2">
                        {['customer_name', 'order_id', 'total_price', 'restaurant_name', 'partner_name', 'tracking_url'].map(v => (
                          <code key={v} className="bg-white px-2 py-1 rounded border border-amber-200 text-xs text-amber-700">{'{{' + v + '}}'}</code>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Тема (Subject)</label>
                        <input 
                          type="text" 
                          value={selectedTemplate.subject}
                          onChange={e => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Содржина (HTML Body)</label>
                        <textarea 
                          value={selectedTemplate.body}
                          onChange={e => setSelectedTemplate({...selectedTemplate, body: e.target.value})}
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-64 font-mono text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="is_active"
                          checked={selectedTemplate.is_active === 1 || selectedTemplate.is_active === true}
                          onChange={e => setSelectedTemplate({...selectedTemplate, is_active: e.target.checked})}
                          className="w-5 h-5 text-indigo-600 rounded"
                        />
                        <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Активен шаблон</label>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button 
                      onClick={() => setSelectedTemplate(null)}
                      className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all"
                    >
                      Откажи
                    </button>
                    <button 
                      onClick={() => {
                        fetch(`/api/email/templates/${selectedTemplate.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(selectedTemplate)
                        })
                        .then(res => {
                          if (res.ok) {
                            alert('Шаблонот е успешно зачуван!');
                            setSelectedTemplate(null);
                            fetchEmailData();
                          } else {
                            alert('Грешка при зачувување на шаблонот.');
                          }
                        })
                        .catch(err => {
                          console.error('Failed to save email template', err);
                          alert('Грешка при комуникација со серверот.');
                        });
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                    >
                      Зачувај Промени
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Settings className="text-slate-500" />
              Глобални поставки
            </h2>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Store size={20} className="text-blue-500" />
                Поставки за Компанијата
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Назив на компанија</label>
                    <input 
                      type="text" 
                      value={globalSettings.company_name || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_name: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="Назив..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Лого на компанија (URL)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={globalSettings.company_logo_url || ''} 
                        onChange={e => setGlobalSettings({...globalSettings, company_logo_url: e.target.value})} 
                        className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="https://..." 
                      />
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <Upload size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGlobalFileUpload(e, 'company_logo_url')} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Икона за апликација (PWA Icon)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={globalSettings.app_icon_url || ''} 
                        onChange={e => setGlobalSettings({...globalSettings, app_icon_url: e.target.value})} 
                        className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="https://..." 
                      />
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <Upload size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGlobalFileUpload(e, 'app_icon_url')} />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Оваа икона ќе се користи кога корисникот ќе ја додаде апликацијата на почетниот екран (Add to Home Screen).</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Адреса</label>
                    <input 
                      type="text" 
                      value={globalSettings.company_address || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_address: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="Адреса..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Телефон</label>
                    <input 
                      type="text" 
                      value={globalSettings.company_phone || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_phone: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="Телефон..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Интернет страница</label>
                    <input 
                      type="text" 
                      value={globalSettings.company_website || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_website: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://..." 
                    />
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Препорачано за вас</p>
                          <p className="text-xs text-slate-500">Прикажи го делот за AI препораки на почетната страна</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setGlobalSettings({...globalSettings, show_recommendations: globalSettings.show_recommendations === 'false' ? 'true' : 'false'})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${globalSettings.show_recommendations !== 'false' ? 'bg-orange-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${globalSettings.show_recommendations !== 'false' ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Податоци за Фактурирање (PIZZATIME)</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">ЕДБ (Даночен број)</label>
                        <input 
                          type="text" 
                          value={globalSettings.pizzatime_edb || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, pizzatime_edb: e.target.value})} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="ЕДБ..." 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Жиро сметка</label>
                        <input 
                          type="text" 
                          value={globalSettings.pizzatime_bank_account || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, pizzatime_bank_account: e.target.value})} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="Сметка..." 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Банка</label>
                        <input 
                          type="text" 
                          value={globalSettings.pizzatime_bank_name || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, pizzatime_bank_name: e.target.value})} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="Назив на банка..." 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Социјални медиуми</h4>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                      <Facebook size={16} className="text-blue-600" /> Facebook
                    </label>
                    <input 
                      type="text" 
                      value={globalSettings.company_facebook || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_facebook: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://facebook.com/..." 
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                      <Instagram size={16} className="text-pink-600" /> Instagram
                    </label>
                    <input 
                      type="text" 
                      value={globalSettings.company_instagram || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_instagram: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://instagram.com/..." 
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                      <Twitter size={16} className="text-blue-400" /> Twitter
                    </label>
                    <input 
                      type="text" 
                      value={globalSettings.company_twitter || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_twitter: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://twitter.com/..." 
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                      <Linkedin size={16} className="text-blue-700" /> LinkedIn
                    </label>
                    <input 
                      type="text" 
                      value={globalSettings.company_linkedin || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, company_linkedin: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://linkedin.com/..." 
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <LayoutDashboard size={20} className="text-orange-500" />
                    Почетен Слајдер (Home Slider)
                  </h3>
                  <button 
                    onClick={() => {
                      setEditingSliderItem(null);
                      setNewSliderItem({ title: '', image_url: '', cta_text: '', cta_link: '', display_order: homeSlider.length, is_active: 1 });
                      setIsHomeSliderModalOpen(true);
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} /> Додај слајд
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homeSlider.map(item => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-video relative overflow-hidden">
                        <img src={item.image_url || null} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingSliderItem(item);
                              setIsHomeSliderModalOpen(true);
                            }}
                            className="bg-white text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-colors"
                          >
                            <Settings2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSliderItem(item.id)}
                            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        {!item.is_active && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Неактивен
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="font-bold text-slate-800 truncate">{item.title || 'Без наслов'}</div>
                        <div className="text-xs text-slate-500 truncate">{item.cta_text || 'Без текст на копче'}</div>
                      </div>
                    </div>
                  ))}
                  {homeSlider.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                      Нема додадено слајдови за почетната страница.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-emerald-500" />
                  Payten NestPay® Поставки
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Име на фирма (PizzaTime)</label>
                    <input 
                      type="text" 
                      value={globalSettings.pizzatime_company_name || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, pizzatime_company_name: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="PizzaTime DOOEL" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ЕДБ / Даночен број</label>
                    <input 
                      type="text" 
                      value={globalSettings.pizzatime_edb || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, pizzatime_edb: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="40800..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Адреса на седиште</label>
                    <input 
                      type="text" 
                      value={globalSettings.pizzatime_address || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, pizzatime_address: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="ул. Македонија бр. 1" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Жиро сметка</label>
                    <input 
                      type="text" 
                      value={globalSettings.pizzatime_bank_account || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, pizzatime_bank_account: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="210..." 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-2 mb-2 col-span-2">
                    <input 
                      type="checkbox" 
                      id="payten_enabled"
                      checked={globalSettings.payten_enabled === 'true'} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_enabled: e.target.checked ? 'true' : 'false'})} 
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="payten_enabled" className="text-sm font-bold text-slate-700">Овозможи плаќање со картичка (Payten)</label>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Client ID</label>
                    <input 
                      type="text" 
                      value={globalSettings.payten_client_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_client_id: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="100200..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Username (Merchant)</label>
                    <input 
                      type="text" 
                      value={globalSettings.payten_username || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_username: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="username" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Password (Merchant)</label>
                    <input 
                      type="password" 
                      value={globalSettings.payten_password || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_password: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Store Key</label>
                    <input 
                      type="password" 
                      value={globalSettings.payten_store_key || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_store_key: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="••••••••" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Terminal ID</label>
                    <input 
                      type="text" 
                      value={globalSettings.payten_terminal_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_terminal_id: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="3D..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Store Type</label>
                    <input 
                      type="text" 
                      value={globalSettings.payten_store_type || '3D_PAY'} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_store_type: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="3D_PAY" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Currency Code</label>
                    <input 
                      type="text" 
                      value={globalSettings.payten_currency || '807'} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_currency: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="807" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">3D Post URL</label>
                    <input 
                      type="text" 
                      value={globalSettings.payten_3d_url || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_3d_url: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">API Post URL</label>
                    <input 
                      type="text" 
                      value={globalSettings.payten_api_url || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_api_url: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Режим на работа</label>
                    <select 
                      value={globalSettings.payten_mode || 'test'} 
                      onChange={e => setGlobalSettings({...globalSettings, payten_mode: e.target.value})} 
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="test">Тест (Sandbox)</option>
                      <option value="prod">Продукција (Live)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Globe size={20} className="text-blue-500" />
                    Логоа на Банка и Картички (Footer)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Лого на Банка (URL)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={globalSettings.bank_logo_url || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, bank_logo_url: e.target.value})} 
                          className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="https://..." 
                        />
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                          <Upload size={18} />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGlobalFileUpload(e, 'bank_logo_url')} />
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Visa Logo (URL)</label>
                        <input 
                          type="text" 
                          value={globalSettings.visa_logo_url || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, visa_logo_url: e.target.value})} 
                          className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mastercard Logo (URL)</label>
                        <input 
                          type="text" 
                          value={globalSettings.mastercard_logo_url || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, mastercard_logo_url: e.target.value})} 
                          className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Diners Logo (URL)</label>
                        <input 
                          type="text" 
                          value={globalSettings.diners_logo_url || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, diners_logo_url: e.target.value})} 
                          className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Maestro Logo (URL)</label>
                        <input 
                          type="text" 
                          value={globalSettings.maestro_logo_url || ''} 
                          onChange={e => setGlobalSettings({...globalSettings, maestro_logo_url: e.target.value})} 
                          className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart size={20} className="text-indigo-500" />
                    Маркетинг и Аналитика
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Google Analytics Measurement ID (G-XXXXXXX)</label>
                      <input 
                        type="text" 
                        value={globalSettings.google_analytics_id || ''} 
                        onChange={e => setGlobalSettings({...globalSettings, google_analytics_id: e.target.value})} 
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="G-XXXXXXXXXX" 
                      />
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={saveGlobalSettings}
                  disabled={isSavingSettings}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  {isSavingSettings ? 'Се зачувува...' : 'Зачувај поставки за компанија'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Изглед на апликацијата</h3>
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Позадинска слика (Background) за нарачатели</label>
                  <p className="text-xs text-slate-500 mb-2">Оваа слика ќе се прикажува како позадина кога клиентите пребаруваат продукти.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={globalSettings.customer_background_url || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, customer_background_url: e.target.value})} 
                      className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://..." 
                    />
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                      <Upload size={18} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGlobalFileUpload(e, 'customer_background_url')} />
                    </label>
                  </div>
                  {globalSettings.customer_background_url && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 h-48 relative">
                      <img src={globalSettings.customer_background_url} alt="Background preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                          <p className="font-bold text-slate-800">Приказ на содржината</p>
                          <p className="text-sm text-slate-500">Вака ќе изгледа содржината врз позадината</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={saveGlobalSettings}
                  disabled={isSavingSettings}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  {isSavingSettings ? 'Се зачувува...' : 'Зачувај поставки'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Поставки за достава</h3>
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Глобална цена за достава (ден.)</label>
                  <p className="text-xs text-slate-500 mb-2">Оваа цена ќе се додава на секоја нарачка која се врши преку платформата.</p>
                  <input 
                    type="number" 
                    value={globalSettings.delivery_fee || '0'} 
                    onChange={e => setGlobalSettings({...globalSettings, delivery_fee: e.target.value})} 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="пр. 100" 
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">Специјална ознака за оброци (напр. Студентски)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Име на ознаката</label>
                      <input 
                        type="text" 
                        value={globalSettings.special_badge_name || ''} 
                        onChange={e => setGlobalSettings({...globalSettings, special_badge_name: e.target.value})} 
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="пр. Студент" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Максимална сума (ден.)</label>
                      <input 
                        type="number" 
                        value={globalSettings.special_badge_amount || ''} 
                        onChange={e => setGlobalSettings({...globalSettings, special_badge_amount: e.target.value})} 
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="пр. 180" 
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Оваа ознака ќе се појавува на сите производи чија цена е помала или еднаква на наведената сума.</p>
                </div>
                
                <button 
                  onClick={saveGlobalSettings}
                  disabled={isSavingSettings}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  {isSavingSettings ? 'Се зачувува...' : 'Зачувај поставки'}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'admins' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Award className="text-indigo-600" />
                Управување со Администратори
              </h2>
              <button 
                onClick={() => setIsCreateAdminModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <Plus size={20} />
                Нов Администратор
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Име</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Корисничко име</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Е-маил</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Улога</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Пристап</th>
                    <th className="p-4 font-bold text-slate-500 uppercase text-xs tracking-wider text-right">Акции</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {admins.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{a.name}</td>
                      <td className="p-4 text-slate-600">{a.username}</td>
                      <td className="p-4 text-slate-600">{a.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${a.role === 'super' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {a.role === 'super' ? 'Супер Админ' : 'Администратор'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {a.role === 'super' ? (
                            <span className="text-xs text-slate-400 italic">Целосен пристап</span>
                          ) : (
                            (() => {
                              let perms = a.permissions;
                              if (typeof perms === 'string') {
                                try {
                                  perms = JSON.parse(perms);
                                } catch (e) {
                                  perms = [];
                                }
                              }
                              return Array.isArray(perms) ? perms.map((p: string) => (
                                <span key={p} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">
                                  {p}
                                </span>
                              )) : null;
                            })()
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {a.role !== 'super' && (
                          <button 
                            onClick={() => handleDeleteAdmin(a.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Избриши"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'bundles' ? (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Award className="text-orange-500" />
                  Барања за нови пакети
                  {pendingBundles.length > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                      {pendingBundles.length}
                    </span>
                  )}
                </h2>
                <button 
                  onClick={handleClearAllBundles}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-all"
                >
                  <Trash2 size={16} />
                  Избриши ги сите пакети
                </button>
              </div>
              
              {pendingBundles.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p>Нема нови барања за пакети.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {pendingBundles.map(bundle => (
                    <div key={bundle.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-orange-300 transition-all flex flex-col md:flex-row">
                      <div className="w-full md:w-48 h-48 md:h-auto relative bg-slate-100">
                        {bundle.image_url ? (
                          <img src={bundle.image_url} alt={bundle.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Store size={48} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="text-xl font-bold text-slate-800">{bundle.name}</h3>
                              <p className="text-sm text-emerald-600 font-bold">{bundle.restaurant_name}</p>
                            </div>
                            <div className="text-2xl font-black text-orange-600">
                              {bundle.price} ден.
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm mb-4">{bundle.description}</p>
                          
                          <div className="bg-slate-50 rounded-xl p-4 mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Производи во пакетот:</h4>
                            <div className="space-y-1">
                              {bundle.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-slate-700">{item.quantity}x {item.name}</span>
                                  <span className="text-slate-400">{item.price} ден.</span>
                                </div>
                              ))}
                              <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-bold">
                                <span className="text-slate-800">Вкупна вредност:</span>
                                <span className="text-slate-800">
                                  {bundle.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} ден.
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-emerald-600 font-bold">
                                <span>Заштеда за корисникот:</span>
                                <span>
                                  {bundle.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - bundle.price} ден.
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              Достапно: {bundle.start_time} - {bundle.end_time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity size={14} />
                              Денови: {(() => {
                                try {
                                  const days = typeof bundle.available_days === 'string' ? JSON.parse(bundle.available_days) : bundle.available_days;
                                  return Array.isArray(days) ? days.join(', ') : bundle.available_days;
                                } catch (e) {
                                  return bundle.available_days;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                          <button 
                            onClick={() => handleApproveBundle(bundle.id)}
                            className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Check size={18} /> Одобри
                          </button>
                          <button 
                            onClick={() => handleRejectBundle(bundle.id)}
                            className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <X size={18} /> Одбиј
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="text-blue-500" />
                Историја на пакети
              </h2>

              <div className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ресторан</label>
                  <select 
                    value={bundleFilterRestaurant}
                    onChange={(e) => setBundleFilterRestaurant(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Сите ресторани</option>
                    {approvedRestaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Од датум</label>
                  <input 
                    type="date"
                    value={bundleFilterStartDate}
                    onChange={(e) => setBundleFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">До датум</label>
                  <input 
                    type="date"
                    value={bundleFilterEndDate}
                    onChange={(e) => setBundleFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Пакет</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ресторан</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Цена</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Датум</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allBundles.map(bundle => (
                      <tr key={bundle.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                              {bundle.image_url ? (
                                <img src={bundle.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Award size={16} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{bundle.name}</p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{bundle.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{bundle.restaurant_name}</td>
                        <td className="p-4 text-sm font-bold text-slate-800">{bundle.price} ден.</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            bundle.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            bundle.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {bundle.status === 'approved' ? 'Одобрен' :
                             bundle.status === 'pending' ? 'Во чекање' : 'Одбиен'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(bundle.created_at).toLocaleDateString('mk-MK')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allBundles.length === 0 && (
                  <div className="p-12 text-center text-slate-400">Нема пронајдено пакети.</div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'restaurants' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Корисници</p>
                <p className="text-2xl font-bold text-slate-800">1,248</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Store size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Ресторани</p>
                <p className="text-2xl font-bold text-slate-800">24</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Activity size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Денешни Нарачки</p>
                <p className="text-2xl font-bold text-slate-800">156</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Store className="text-orange-500" />
            Барања за нови ресторани
            {pendingRestaurants.length > 0 && (
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                {pendingRestaurants.length}
              </span>
            )}
          </h2>
          
          {pendingRestaurants.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p>Нема нови барања за регистрација.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRestaurants.map(rest => (
                <div key={rest.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-orange-300 transition-colors cursor-pointer" onClick={() => openApprovalModal(rest)}>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{rest.name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {rest.address}, {rest.city}</span>
                      <span>📧 {rest.email}</span>
                      <span>📞 {rest.phone}</span>
                      {rest.has_own_delivery === 1 && <span className="text-emerald-600 font-medium">✓ Сопствена достава</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={() => openApprovalModal(rest)} className="flex-1 md:flex-none bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                      <FileText size={18} /> Прегледај
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" />
            Активни ресторани
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
              {approvedRestaurants.length}
            </span>
          </h2>
          
          {approvedRestaurants.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p>Нема активни ресторани.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedRestaurants.map(rest => (
                <div key={rest.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-emerald-300 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{rest.name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {rest.address}, {rest.city}</span>
                      <span>👤 {rest.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => openApprovalModal(rest)}
                      className="flex-1 md:flex-none bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Settings2 size={18} /> Поставки
                    </button>
                    <button onClick={() => loginAsOwner(rest)} className="flex-1 md:flex-none bg-slate-800 text-white hover:bg-slate-900 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                      <LogIn size={18} /> Најави се како сопственик
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      ) : (
        <div className="flex items-center justify-center min-h-[400px] text-slate-400">
          Изберете таб за да прегледате содржина.
        </div>
      )}
    </main>

      {/* Generate Invoice Modal */}
      {showGenerateInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">Генерирај Нова Пресметка</h2>
              <button onClick={() => setShowGenerateInvoiceModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Избери Ресторан</label>
                <select 
                  value={selectedRestaurantForInvoice}
                  onChange={(e) => setSelectedRestaurantForInvoice(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                >
                  <option value="">-- Избери ресторан --</option>
                  {approvedRestaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Од датум</label>
                  <input 
                    type="date" 
                    value={invoicePeriodStart}
                    onChange={(e) => setInvoicePeriodStart(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">До датум</label>
                  <input 
                    type="date" 
                    value={invoicePeriodEnd}
                    onChange={(e) => setInvoicePeriodEnd(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                Системот ќе ги пресмета сите завршени нарачки за избраниот период кои досега не се фактурирани.
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowGenerateInvoiceModal(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Откажи
                  </button>
                  <button 
                    onClick={handleGenerateInvoice}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                  >
                    Генерирај
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedRestaurant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedRestaurant.status === 'approved' ? 'Поставки за ресторан' : 'Преглед на ресторан'}
              </h2>
              <button onClick={() => setSelectedRestaurant(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Store className="text-orange-500" /> Основни податоци</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500 text-sm block">Назив</span>
                    <input 
                      type="text" 
                      value={selectedRestaurant.name || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, name: e.target.value})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-sm block">Град</span>
                    <input 
                      type="text" 
                      value={selectedRestaurant.city || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, city: e.target.value})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div><span className="text-slate-500 text-sm block">Поштенски број</span><span className="font-medium">{selectedRestaurant.spare_3 || 'Нема'}</span></div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 text-sm block">Адреса</span>
                    <input 
                      type="text" 
                      value={selectedRestaurant.address || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, address: e.target.value})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-sm block">Географска ширина (Lat)</span>
                    <input 
                      type="number" 
                      step="any"
                      value={selectedRestaurant.lat || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, lat: Number(e.target.value)})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="41.1234"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-sm block">Географска должина (Lng)</span>
                    <input 
                      type="number" 
                      step="any"
                      value={selectedRestaurant.lng || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, lng: Number(e.target.value)})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="21.1234"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 text-sm block mb-2 font-bold">Изберете локација на мапа</span>
                    <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
                      <LocationPickerMap 
                        location={selectedRestaurant.lat && selectedRestaurant.lng ? [selectedRestaurant.lat, selectedRestaurant.lng] : null}
                        setLocation={(loc) => setSelectedRestaurant({...selectedRestaurant, lat: loc[0], lng: loc[1]})}
                        city={selectedRestaurant.city}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Кликнете на мапата за да ја одредите точната локација на ресторанот.</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-sm block">Е-маил</span>
                    <input 
                      type="email" 
                      value={selectedRestaurant.email || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, email: e.target.value})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-sm block">Телефон</span>
                    <input 
                      type="text" 
                      value={selectedRestaurant.phone || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, phone: e.target.value})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 text-sm block">Жиро сметка</span>
                    <input 
                      type="text" 
                      value={selectedRestaurant.bank_account || ''} 
                      onChange={e => setSelectedRestaurant({...selectedRestaurant, bank_account: e.target.value})}
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-orange-500" /> Работно време за достава</h3>
                {renderWorkingHours(selectedRestaurant.working_hours)}
              </div>

              {/* Delivery Zones */}
              {selectedRestaurant.has_own_delivery === 1 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="text-orange-500" /> Зони на достава</h3>
                  <DeliveryZoneMap 
                    zones={JSON.parse(selectedRestaurant.delivery_zones || '[]')} 
                    readOnly={true} 
                  />
                </div>
              )}

              {/* Spare Fields */}
              {(selectedRestaurant.spare_1 || selectedRestaurant.spare_2 || selectedRestaurant.spare_3) && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-orange-500" /> Дополнителни информации</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedRestaurant.spare_1 && <div><span className="text-slate-500 text-sm block">Резервно поле 1</span><span className="font-medium">{selectedRestaurant.spare_1}</span></div>}
                    {selectedRestaurant.spare_2 && <div><span className="text-slate-500 text-sm block">Резервно поле 2</span><span className="font-medium">{selectedRestaurant.spare_2}</span></div>}
                    {selectedRestaurant.spare_3 && <div><span className="text-slate-500 text-sm block">Резервно поле 3</span><span className="font-medium">{selectedRestaurant.spare_3}</span></div>}
                  </div>
                </div>
              )}

              {/* Status and Access */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings2 className="text-slate-600" /> Статус и Пристап</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 transition-all">
                    <input 
                      type="checkbox" 
                      checked={selectedRestaurant.is_active === 1}
                      onChange={(e) => setSelectedRestaurant({...selectedRestaurant, is_active: e.target.checked ? 1 : 0})}
                      className="w-6 h-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block font-bold text-slate-800">Активен ресторан</span>
                      <span className="text-xs text-slate-500">Прикажи го ресторанот во листата на корисници</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 transition-all">
                    <input 
                      type="checkbox" 
                      checked={selectedRestaurant.has_admin_access === 1}
                      onChange={(e) => setSelectedRestaurant({...selectedRestaurant, has_admin_access: e.target.checked ? 1 : 0})}
                      className="w-6 h-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block font-bold text-slate-800">Администраторски пристап</span>
                      <span className="text-xs text-slate-500">Дозволи пристап до индивидуалниот панел на ресторанот</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Configuration */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2"><DollarSign className="text-blue-600" /> Услови за плаќање и Додатоци</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">Методи на плаќање</label>
                    <div className="flex flex-wrap gap-4">
                      {['cash', 'card', 'points'].map(method => (
                        <label key={method} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={paymentConfig.methods.includes(method)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPaymentConfig({...paymentConfig, methods: [...paymentConfig.methods, method]});
                              } else {
                                setPaymentConfig({...paymentConfig, methods: paymentConfig.methods.filter(m => m !== method)});
                              }
                            }}
                            className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-blue-800 font-medium">
                            {method === 'cash' ? 'Готовина' : method === 'card' ? 'Картичка' : 'Поени'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-blue-900">Дополнителни трошоци (на пр. прибор)</label>
                      <button 
                        onClick={() => setPaymentConfig({...paymentConfig, fees: [...paymentConfig.fees, {name: '', amount: 0}]})}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} /> Додај
                      </button>
                    </div>
                    <div className="space-y-2">
                      {paymentConfig.fees.map((fee, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder="Име (пр. Прибор)" 
                            value={fee.name}
                            onChange={(e) => {
                              const newFees = [...paymentConfig.fees];
                              newFees[idx].name = e.target.value;
                              setPaymentConfig({...paymentConfig, fees: newFees});
                            }}
                            className="flex-1 p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input 
                            type="number" 
                            placeholder="Износ" 
                            value={fee.amount}
                            onChange={(e) => {
                              const newFees = [...paymentConfig.fees];
                              newFees[idx].amount = Number(e.target.value);
                              setPaymentConfig({...paymentConfig, fees: newFees});
                            }}
                            className="w-24 p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button 
                            onClick={() => setPaymentConfig({...paymentConfig, fees: paymentConfig.fees.filter((_, i) => i !== idx)})}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {paymentConfig.fees.length === 0 && (
                        <p className="text-xs text-blue-500 italic">Нема дефинирано дополнителни трошоци.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      Поставки за Фактурирање
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Денови на фактурирање (период)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={billingCycleDays}
                          onChange={(e) => setBillingCycleDays(Number(e.target.value))}
                          className="w-full p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="пр. 7"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Стапка на ДДВ (%)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            step="0.1"
                            value={vatRate}
                            onChange={(e) => setVatRate(Number(e.target.value))}
                            className="w-full p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                            placeholder="пр. 18"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Award size={16} className="text-blue-600" />
                      Поставки за Лојалност и Поени
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Заработка на поени (% од нарачка)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={paymentConfig.loyalty_earn_percent}
                            onChange={(e) => setPaymentConfig({...paymentConfig, loyalty_earn_percent: Number(e.target.value)})}
                            className="w-full p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Макс. плаќање со поени (% од нарачка)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={paymentConfig.loyalty_max_pay_percent}
                            onChange={(e) => setPaymentConfig({...paymentConfig, loyalty_max_pay_percent: Number(e.target.value)})}
                            className="w-full p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs">%</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-blue-500 italic">
                      * 1 поен = 1 денар. Клиентите заработуваат поени при секоја нарачка и можат да ги користат за попуст при плаќање.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Globe size={16} className="text-blue-600" />
                      SEO Поставки
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">SEO Наслов (Title Tag)</label>
                        <input 
                          type="text" 
                          value={seoSettings.title}
                          onChange={(e) => setSeoSettings({...seoSettings, title: e.target.value})}
                          className="w-full p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="пр. Најдобрата Пица во Скопје | Име на Ресторан"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Мета Опис (Meta Description)</label>
                        <textarea 
                          value={seoSettings.description}
                          onChange={(e) => setSeoSettings({...seoSettings, description: e.target.value})}
                          className="w-full p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-20"
                          placeholder="Краток опис кој ќе се појави на Google..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Мета Тагови (Keywords)</label>
                        <input 
                          type="text" 
                          value={seoSettings.keywords}
                          onChange={(e) => setSeoSettings({...seoSettings, keywords: e.target.value})}
                          className="w-full p-2 text-sm border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="пица, достава, храна, скопје..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Schema.org JSON-LD (GEO / AI)</label>
                        <textarea 
                          value={seoSettings.schema_json}
                          onChange={(e) => setSeoSettings({...seoSettings, schema_json: e.target.value})}
                          className="w-full p-2 text-sm font-mono border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-32"
                          placeholder='{ "@context": "https://schema.org", "@type": "Restaurant", ... }'
                        />
                        <p className="mt-1 text-[10px] text-blue-500 italic">
                          * Ова им помага на пребарувачите и AI моделите подобро да го разберат вашиот бизнис.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Section */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2"><Percent className="text-orange-600" /> Договор и Одобрување</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Корисничко име</label>
                    <input 
                      type="text" 
                      value={credentials.username} 
                      onChange={e => setCredentials({...credentials, username: e.target.value})}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Лозинка</label>
                    <input 
                      type="text" 
                      value={credentials.password} 
                      onChange={e => setCredentials({...credentials, password: e.target.value})}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Провизија (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={contractPercentage} 
                      onChange={e => setContractPercentage(Number(e.target.value))}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Достава (ден.)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={deliveryFee} 
                      onChange={e => setDeliveryFee(Number(e.target.value))}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                      placeholder="пр. 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Минимум за достава (ден.)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={minOrderAmount} 
                      onChange={e => setMinOrderAmount(Number(e.target.value))}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                      placeholder="пр. 300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Лого URL</label>
                    <input 
                      type="text" 
                      value={restaurantImages.logo_url} 
                      onChange={e => setRestaurantImages({...restaurantImages, logo_url: e.target.value})}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Cover URL</label>
                    <input 
                      type="text" 
                      value={restaurantImages.cover_url} 
                      onChange={e => setRestaurantImages({...restaurantImages, cover_url: e.target.value})}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">HEADER PHOTO URL</label>
                    <input 
                      type="text" 
                      value={restaurantImages.header_image} 
                      onChange={e => setRestaurantImages({...restaurantImages, header_image: e.target.value})}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {selectedRestaurant.status !== 'approved' && (
                    <button onClick={() => handleReject(selectedRestaurant.id)} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-6 py-3 rounded-xl font-bold transition-colors">
                      Одбиј
                    </button>
                  )}
                  <button onClick={handleSaveRestaurant} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20">
                    {selectedRestaurant.status === 'approved' ? 'Зачувај промени' : 'Одобри Ресторан'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Approval Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">Одобрување на Кампања</h2>
              <button onClick={() => setSelectedCampaign(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2">{selectedCampaign.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{selectedCampaign.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-400 block">Попуст</span><span className="font-bold">{selectedCampaign.budget} ден.</span></div>
                  <div><span className="text-slate-400 block">Количина кодови</span><span className="font-bold">{selectedCampaign.quantity}</span></div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Изберете формат на кодови</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    '--- -- ---',
                    '-- -- ----',
                    '---- ----',
                    '------',
                    '--- --- ---'
                  ].map(format => (
                    <label key={format} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      codeFormat === format ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="codeFormat" 
                          checked={codeFormat === format}
                          onChange={() => setCodeFormat(format)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="font-mono font-bold text-slate-700">{format}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Пример: {format.replace(/-/g, 'X')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => handleRejectCampaign(selectedCampaign.id)}
                  className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-50 font-bold py-4 rounded-2xl transition-all"
                >
                  Одбиј
                </button>
                <button 
                  onClick={handleApproveCampaign}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Одобри и Генерирај
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {isCreateCampaignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold">Креирај Нова Кампања</h2>
              <button onClick={() => setIsCreateCampaignModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="p-8 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Име на кампања *</label>
                  <input 
                    type="text"
                    required
                    value={newCampaign.name || ''}
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="пр. Летен Попуст 2024"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Ресторан (Опционално)</label>
                  <select 
                    value={newCampaign.restaurant_id}
                    onChange={e => setNewCampaign({...newCampaign, restaurant_id: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Сите ресторани (Маркетинг кампања)</option>
                    {approvedRestaurants.map(rest => (
                      <option key={rest.id} value={rest.id}>{rest.name} ({rest.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Опис</label>
                <textarea 
                  value={newCampaign.description || ''}
                  onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  placeholder="Краток опис на кампањата..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Попуст по нарачка (ден.) *</label>
                  <input 
                    type="number"
                    required
                    value={newCampaign.budget || ''}
                    onChange={e => setNewCampaign({...newCampaign, budget: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Број на кодови *</label>
                  <input 
                    type="number"
                    required
                    value={newCampaign.quantity || ''}
                    onChange={e => setNewCampaign({...newCampaign, quantity: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Почеток *</label>
                  <input 
                    type="date"
                    required
                    value={newCampaign.start_date}
                    onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Крај *</label>
                  <input 
                    type="date"
                    required
                    value={newCampaign.end_date}
                    onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsCreateCampaignModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Откажи
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Креирај Кампања
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Review Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-800">Преглед на доставувач</h2>
              <button onClick={() => setSelectedDelivery(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Bike className="text-emerald-500" /> Лични податоци</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div><span className="text-slate-500 text-sm block">Име</span><span className="font-medium">{selectedDelivery.name}</span></div>
                  <div><span className="text-slate-500 text-sm block">Град</span><span className="font-medium">{selectedDelivery.city}</span></div>
                  <div className="md:col-span-2"><span className="text-slate-500 text-sm block">Адреса</span><span className="font-medium">{selectedDelivery.address}</span></div>
                  <div><span className="text-slate-500 text-sm block">Е-маил</span><span className="font-medium">{selectedDelivery.email}</span></div>
                  <div><span className="text-slate-500 text-sm block">Телефон</span><span className="font-medium">{selectedDelivery.phone}</span></div>
                  <div className="md:col-span-2"><span className="text-slate-500 text-sm block">Жиро сметка</span><span className="font-medium font-mono">{selectedDelivery.bank_account}</span></div>
                </div>
              </div>

              {/* Working Hours */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-emerald-500" /> Работно време</h3>
                {renderWorkingHours(selectedDelivery.working_hours)}
              </div>

              {/* Preferred Restaurants */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Store className="text-emerald-500" /> Избрани ресторани за соработка</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {JSON.parse(selectedDelivery.preferred_restaurants || '[]').map((restId: number) => {
                    const rest = approvedRestaurants.find(r => r.id === restId);
                    return (
                      <div key={restId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                          <Store size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{rest?.name || `Ресторан ID: ${restId}`}</p>
                          <p className="text-[10px] text-slate-500">{rest?.address}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Approval Section */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2"><LogIn className="text-emerald-600" /> Кредиенцијали и Одобрување</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-2">Корисничко име</label>
                    <input 
                      type="text" 
                      value={credentials.username} 
                      onChange={e => setCredentials({...credentials, username: e.target.value})}
                      className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-2">Лозинка</label>
                    <input 
                      type="text" 
                      value={credentials.password} 
                      onChange={e => setCredentials({...credentials, password: e.target.value})}
                      className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${hasSignedContract ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-emerald-200 group-hover:border-emerald-400'}`} onClick={() => setHasSignedContract(!hasSignedContract)}>
                      {hasSignedContract && <Check size={16} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium text-emerald-900">Доставувачот има потпишано договор</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => handleRejectDelivery(selectedDelivery.id)} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-6 py-3 rounded-xl font-bold transition-colors">
                    Одбиј
                  </button>
                  <button onClick={handleApproveDelivery} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20">
                    Одобри Доставувач
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Marketing Associate Modal */}
      {showMarketingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Креирај Маркетинг Соработник</h3>
                <p className="text-indigo-100 text-sm">Внесете ги податоците за новиот соработник</p>
              </div>
              <button onClick={() => setShowMarketingModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateMarketing} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Назив на компанија</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.company_name || ''}
                    onChange={e => setNewAssociate({...newAssociate, company_name: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Контакт лице</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.contact_person || ''}
                    onChange={e => setNewAssociate({...newAssociate, contact_person: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Телефонски број</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.phone}
                    onChange={e => setNewAssociate({...newAssociate, phone: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Жиро сметка</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.bank_account}
                    onChange={e => setNewAssociate({...newAssociate, bank_account: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Адреса</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.address}
                    onChange={e => setNewAssociate({...newAssociate, address: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Град</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.city}
                    onChange={e => setNewAssociate({...newAssociate, city: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Корисничко име</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.username}
                    onChange={e => setNewAssociate({...newAssociate, username: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Лозинка</label>
                  <input 
                    type="password" 
                    required
                    value={newAssociate.password}
                    onChange={e => setNewAssociate({...newAssociate, password: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowMarketingModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all"
                >
                  Откажи
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Креирај
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Used Codes Modal */}
      {selectedCampaignForDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Детали за кампања: {selectedCampaignForDetails.name}</h2>
                <div className="flex gap-4 mt-2 text-sm text-slate-500">
                  <span>Вкупно кодови: <strong className="text-slate-800">{selectedCampaignForDetails.quantity || 0}</strong></span>
                  <span>Искористени: <strong className="text-emerald-600">{usedCodes.length}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCampaignForDetails(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Искористени кодови</h3>
              {usedCodes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p>Сеуште нема искористени кодови за оваа кампања.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-slate-500 text-sm">
                        <th className="pb-3 font-medium">Код</th>
                        <th className="pb-3 font-medium">Време на користење</th>
                        <th className="pb-3 font-medium">Локација</th>
                        <th className="pb-3 font-medium">Ресторан</th>
                        <th className="pb-3 font-medium">Нарачка #</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {usedCodes.map((code, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-mono font-bold text-indigo-600">{code.code}</td>
                          <td className="py-4 text-slate-600">{new Date(code.used_at).toLocaleString()}</td>
                          <td className="py-4 text-slate-600">{code.delivery_address}</td>
                          <td className="py-4 text-slate-800 font-medium">{code.restaurant_name}</td>
                          <td className="py-4 text-slate-500">#{code.order_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Used Codes Modal */}
      {selectedCampaignForDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Детали за кампања: {selectedCampaignForDetails.name}</h2>
                <div className="flex gap-4 mt-2 text-sm text-slate-500">
                  <span>Вкупно кодови: <strong className="text-slate-800">{selectedCampaignForDetails.quantity || 0}</strong></span>
                  <span>Искористени: <strong className="text-emerald-600">{usedCodes.length}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCampaignForDetails(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Искористени кодови</h3>
              {usedCodes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p>Сеуште нема искористени кодови за оваа кампања.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-slate-500 text-sm">
                        <th className="pb-3 font-medium">Код</th>
                        <th className="pb-3 font-medium">Време на користење</th>
                        <th className="pb-3 font-medium">Локација</th>
                        <th className="pb-3 font-medium">Ресторан</th>
                        <th className="pb-3 font-medium">Нарачка #</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {usedCodes.map((code, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-mono font-bold text-indigo-600">{code.code}</td>
                          <td className="py-4 text-slate-600">{new Date(code.used_at).toLocaleString()}</td>
                          <td className="py-4 text-slate-600">{code.delivery_address}</td>
                          <td className="py-4 text-slate-800 font-medium">{code.restaurant_name}</td>
                          <td className="py-4 text-slate-500">#{code.order_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delivery Role Management Modal */}
      {isDeliveryRoleModalOpen && selectedDeliveryForRole && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Управувај со доставувач</h3>
              <button onClick={() => setIsDeliveryRoleModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Улога</label>
                <select 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={selectedDeliveryForRole.role || 'rider'}
                  onChange={(e) => setSelectedDeliveryForRole({...selectedDeliveryForRole, role: e.target.value as 'rider' | 'lead'})}
                >
                  <option value="rider">Доставувач (Rider)</option>
                  <option value="lead">Шеф на тим (Lead)</option>
                </select>
              </div>

              {selectedDeliveryForRole.role === 'rider' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Шеф на тим (Fleet Manager)</label>
                  <select 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={selectedDeliveryForRole.fleet_manager_id || ''}
                    onChange={(e) => setSelectedDeliveryForRole({...selectedDeliveryForRole, fleet_manager_id: e.target.value ? parseInt(e.target.value) : undefined})}
                  >
                    <option value="">Без шеф (Самостоен)</option>
                    {allDeliveryPartners
                      .filter(p => p.role === 'lead' && p.id !== selectedDeliveryForRole.id)
                      .map(lead => (
                        <option key={lead.id} value={lead.id}>{lead.name}</option>
                      ))
                    }
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsDeliveryRoleModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Откажи
                </button>
                <button 
                  onClick={() => handleUpdateDeliveryRole(
                    selectedDeliveryForRole.id, 
                    selectedDeliveryForRole.role || 'rider', 
                    selectedDeliveryForRole.fleet_manager_id || null
                  )}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Зачувај
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:backdrop-blur-none print:block print:static">
          <div id="print-section" className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:rounded-none print:w-full">
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center transition-colors print:border-b-2 print:border-slate-200 print:bg-slate-50 ${
              selectedInvoice.type === 'calculation' ? 'bg-purple-50' :
              selectedInvoice.type === 'invoice' ? 'bg-blue-50' :
              (selectedInvoice.type === 'compensation' || selectedInvoice.type === 'КОМПЕНЗАЦИЈА') ? 'bg-slate-50' :
              'bg-orange-50'
            }`}>
              <div className="print:mb-4">
                <h3 className="text-xl font-bold text-slate-800 print:text-lg print:mb-1">
                  {(selectedInvoice.type === 'compensation' || selectedInvoice.type === 'КОМПЕНЗАЦИЈА') ? `КОМПЕНЗАЦИЈА број ${selectedInvoice.invoice_number}` : 
                   `${selectedInvoice.type === 'calculation' ? 'Пресметка' : 'Фактура'} број ${selectedInvoice.invoice_number}`}
                </h3>
                <p className="text-sm text-slate-500 print:text-xs print:text-slate-700 print:font-medium">
                  Ресторан: {selectedInvoice.restaurant_name}
                </p>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors print:hidden">
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8 print:overflow-visible print:p-6 print:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2 print:gap-4 print:mb-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 print:text-slate-500">
                    {(selectedInvoice.type === 'commission' || selectedInvoice.type === 'compensation' || selectedInvoice.type === 'КОМПЕНЗАЦИЈА') ? 'ОД (ДОБАВУВАЧ):' : 'ОД:'}
                  </h4>
                  <div className="space-y-0.5 text-slate-700 dark:text-slate-300 text-xs print:text-slate-900">
                    {(selectedInvoice.type === 'commission' || selectedInvoice.type === 'compensation' || selectedInvoice.type === 'КОМПЕНЗАЦИЈА') ? (
                      <>
                        <p className="font-bold">PizzaTime DOOEL</p>
                        <p>ЕДБ: {selectedInvoice.pizzatimeInfo?.pizzatime_edb || '4030020000000'}</p>
                        <p>Адреса: {selectedInvoice.pizzatimeInfo?.pizzatime_address || 'Бул. Партизански Одреди 1'}</p>
                        <p>Сметка: {selectedInvoice.pizzatimeInfo?.pizzatime_bank_account}</p>
                        <p>Банка: {selectedInvoice.pizzatimeInfo?.pizzatime_bank_name}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">{selectedInvoice.restaurant_name}</p>
                        <p>ЕДБ: {selectedInvoice.restaurant_edb}</p>
                        <p>Адреса: {selectedInvoice.restaurant_address}</p>
                        <p>Град: {selectedInvoice.restaurant_city}</p>
                        <p>Сметка: {selectedInvoice.restaurant_bank_account}</p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 print:text-slate-500">
                    {(selectedInvoice.type === 'commission' || selectedInvoice.type === 'compensation' || selectedInvoice.type === 'КОМПЕНЗАЦИЈА') ? 'ДО (КУПУВАЧ):' : 'ДО:'}
                  </h4>
                  <div className="space-y-0.5 text-slate-700 dark:text-slate-300 text-xs print:text-slate-900">
                    {(selectedInvoice.type === 'commission' || selectedInvoice.type === 'compensation' || selectedInvoice.type === 'КОМПЕНЗАЦИЈА') ? (
                      <>
                        <p className="font-bold">{selectedInvoice.restaurant_name}</p>
                        <p>ЕДБ: {selectedInvoice.restaurant_edb}</p>
                        <p>Адреса: {selectedInvoice.restaurant_address}</p>
                        <p>Град: {selectedInvoice.restaurant_city}</p>
                        <p>Сметка: {selectedInvoice.restaurant_bank_account}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">PizzaTime DOOEL</p>
                        <p>ЕДБ: {selectedInvoice.pizzatimeInfo?.pizzatime_edb || '4030020000000'}</p>
                        <p>Адреса: {selectedInvoice.pizzatimeInfo?.pizzatime_address || 'Бул. Партизански Одреди 1'}</p>
                        <p>Скопје, Македонија</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selectedInvoice.type === 'calculation' && (
                <div className="space-y-6 print:space-y-2">
                  <div className="py-4 border-b border-slate-100 print:border-b-2 print:border-slate-200 print:py-1">
                    <h4 className="text-base font-bold text-slate-800 mb-1 print:text-xs">Листа на нарачки</h4>
                    <p className="text-slate-600 font-medium print:text-[10px]">
                      Период: <span className="text-slate-900">{new Date(selectedInvoice.period_start).toLocaleDateString('mk-MK')} - {new Date(selectedInvoice.period_end).toLocaleDateString('mk-MK')}</span>
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 print:bg-white print:border-b-2">
                          <th className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider print:p-1 print:text-[8px]">ID</th>
                          <th className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider print:p-1 print:text-[8px]">Датум</th>
                          <th className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider print:p-1 print:text-[8px]">Клиент</th>
                          <th className="p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right print:p-1 print:text-[8px]">Износ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoice.orders?.map((order: any) => (
                          <tr key={order.id} className="text-sm">
                            <td className="p-2 text-slate-600 print:p-1 print:text-[10px]">#{order.id}</td>
                            <td className="p-2 text-slate-600 print:p-1 print:text-[10px]">{new Date(order.created_at).toLocaleDateString('mk-MK')}</td>
                            <td className="p-2 text-slate-600 print:p-1 print:text-[10px]">{order.customer_name}</td>
                            <td className="p-2 text-slate-900 font-bold text-right print:p-1 print:text-[10px]">{order.total_price.toLocaleString()} ден.</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 print:mt-2 print:pt-2 print:border-t-2 print:border-slate-200">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 print:text-[8px] print:text-slate-400">
                        Основица
                      </p>
                      <p className="text-lg font-bold text-slate-800 print:text-sm">{selectedInvoice.base_amount.toLocaleString()} ден.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 print:text-[8px] print:text-slate-400">ДДВ ({selectedInvoice.vat_rate}%)</p>
                      <p className="text-lg font-bold text-slate-800 print:text-sm">{selectedInvoice.vat_amount.toLocaleString()} ден.</p>
                    </div>
                    <div className="p-4 bg-purple-600 rounded-xl shadow-lg shadow-purple-600/20 flex flex-col justify-center print:bg-white print:shadow-none print:p-0 print:border-t-2 print:border-slate-200 print:rounded-none">
                      <p className="text-[10px] font-bold text-purple-100 uppercase tracking-wider mb-0.5 print:text-[8px] print:text-slate-400">Вкупно за плаќање</p>
                      <p className="text-2xl font-black text-white print:text-slate-900 print:text-base">
                        {selectedInvoice.total_amount.toLocaleString()} ден.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedInvoice.type === 'compensation' || selectedInvoice.type === 'КОМПЕНЗАЦИЈА') && (
                <div className="space-y-6 py-4 print:space-y-4 print:py-4">
                  <div className="space-y-4 print:space-y-2">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-b print:rounded-none print:p-1">
                      <span className="text-base font-bold text-slate-600 print:text-[10px]">Наш долг по основ на ваша фактура {selectedInvoice.spare_1} :</span>
                      <span className="text-lg font-bold text-slate-900 print:text-xs">{selectedInvoice.total_amount.toLocaleString()} ден.</span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-b print:rounded-none print:p-1">
                      <span className="text-base font-bold text-slate-600 print:text-[10px]">Ваш долг по однос на наша фактура {selectedInvoice.spare_2} :</span>
                      <span className="text-lg font-bold text-slate-900 print:text-xs">{selectedInvoice.commission_amount.toLocaleString()} ден.</span>
                    </div>

                    <div className="mt-8 p-6 bg-slate-800 rounded-2xl shadow-lg shadow-slate-800/20 flex justify-between items-center text-white print:bg-white print:text-slate-900 print:shadow-none print:border-t-2 print:border-slate-900 print:rounded-none print:p-2 print:mt-4">
                      <div>
                        <p className="text-slate-300 font-bold uppercase tracking-widest mb-0.5 print:text-slate-500 print:text-xs">Разлика за уплата</p>
                        <p className="text-xs opacity-80 print:text-slate-400 print:text-[8px]">Износ кој PizzaTime треба да го префрли на ресторанот</p>
                      </div>
                      <span className="text-2xl font-black print:text-base">{selectedInvoice.net_amount.toLocaleString()} ден.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-20 mt-10 pt-10 print:mt-4 print:pt-4 print:gap-8">
                    <div className="text-center border-t border-slate-200 pt-4 print:border-t-2 print:border-slate-400">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-12 print:text-slate-500 print:text-[8px] print:mb-8">За Ресторанот</p>
                      <div className="h-px w-full bg-slate-200 mb-2"></div>
                      <p className="text-sm font-medium text-slate-600 print:text-[10px]">Потпис и печат</p>
                    </div>
                    <div className="text-center border-t border-slate-200 pt-4 print:border-t-2 print:border-slate-400">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-12 print:text-slate-500 print:text-[8px] print:mb-8">За PizzaTime</p>
                      <div className="h-px w-full bg-slate-200 mb-2"></div>
                      <p className="text-sm font-medium text-slate-600 print:text-[10px]">Потпис и печат</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedInvoice.type === 'invoice' && (
                <div className="space-y-4 print:space-y-1">
                  <div className="py-4 border-b border-slate-100 print:border-b-2 print:border-slate-200 print:py-1">
                    <h4 className="text-base font-bold text-slate-800 mb-1 print:text-xs">Опис на услугата</h4>
                    <p className="text-slate-600 font-medium leading-relaxed print:text-slate-900 print:text-sm">
                      Вкупна остварена продажба за период: <span className="text-slate-900">{new Date(selectedInvoice.period_start).toLocaleDateString('mk-MK')} - {new Date(selectedInvoice.period_end).toLocaleDateString('mk-MK')}</span>
                      <br />
                      согласно број на пресметка: <span className="text-slate-900 print:font-bold">#{selectedInvoice.parent_invoice_number || '---'}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 print:grid-cols-3 print:gap-4 print:pt-4 print:border-t-2 print:border-slate-200">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 print:text-[8px] print:text-slate-400">
                        Основица
                      </p>
                      <p className="text-lg font-bold text-slate-800 print:text-sm">{selectedInvoice.base_amount.toLocaleString()} ден.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 print:text-[8px] print:text-slate-400">ДДВ ({selectedInvoice.vat_rate}%)</p>
                      <p className="text-lg font-bold text-slate-800 print:text-sm">{selectedInvoice.vat_amount.toLocaleString()} ден.</p>
                    </div>
                    <div className="p-4 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 flex flex-col justify-center print:bg-white print:shadow-none print:p-0 print:border-t-2 print:border-slate-200 print:rounded-none">
                      <p className="text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-0.5 print:text-[8px] print:text-slate-400">Вкупно за плаќање</p>
                      <p className="text-2xl font-black text-white print:text-slate-900 print:text-base">
                        {selectedInvoice.total_amount.toLocaleString()} ден.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedInvoice.type === 'commission' && (
                <div className="space-y-4 print:space-y-1">
                  <div className="py-4 border-b border-slate-100 print:border-b-2 print:border-slate-200 print:py-1">
                    <h4 className="text-base font-bold text-slate-800 mb-1 print:text-xs">Опис на услугата</h4>
                    <p className="text-slate-600 font-medium leading-relaxed print:text-slate-900 print:text-sm">
                      Провизија за користење на платформата PizzaTime за период: <span className="text-slate-900">{new Date(selectedInvoice.period_start).toLocaleDateString('mk-MK')} - {new Date(selectedInvoice.period_end).toLocaleDateString('mk-MK')}</span>
                      <br />
                      согласно број на пресметка: <span className="text-slate-900 print:font-bold">#{selectedInvoice.parent_invoice_number || '---'}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 print:grid-cols-3 print:gap-4 print:pt-4 print:border-t-2 print:border-slate-200">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 print:text-[8px] print:text-slate-400">
                        Основица (Провизија)
                      </p>
                      <p className="text-lg font-bold text-slate-800 print:text-sm">{selectedInvoice.base_amount.toLocaleString()} ден.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print:border-none print:p-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 print:text-[8px] print:text-slate-400">ДДВ ({selectedInvoice.vat_rate}%)</p>
                      <p className="text-lg font-bold text-slate-800 print:text-sm">{selectedInvoice.vat_amount.toLocaleString()} ден.</p>
                    </div>
                    <div className="p-4 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/20 flex flex-col justify-center print:bg-white print:shadow-none print:p-0 print:border-t-2 print:border-slate-200 print:rounded-none">
                      <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-0.5 print:text-[8px] print:text-slate-400">Вкупно со ДДВ</p>
                      <p className="text-2xl font-black text-white print:text-slate-900 print:text-base">
                        {selectedInvoice.total_amount.toLocaleString()} ден.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center print:hidden">
              <div className="flex gap-2">
                {selectedInvoice.status !== 'Paid' && (
                  <button 
                    onClick={() => {
                      handleDeleteInvoice(selectedInvoice.id);
                      setIsInvoiceModalOpen(false);
                    }}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors flex items-center gap-2 font-bold text-sm"
                    title="Избриши фактура"
                  >
                    <Trash2 size={18} />
                    Избриши
                  </button>
                )}
                <button 
                  onClick={() => window.print()}
                  className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors flex items-center gap-2 font-bold text-sm"
                  title="Печати"
                >
                  <Printer size={18} />
                  Печати
                </button>
              </div>
              <div className="flex justify-end gap-3">
                {selectedInvoice.status === 'Draft' && (
                  <button 
                    onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'Pending')}
                    className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
                  >
                    Испрати до ресторан
                  </button>
                )}
                {selectedInvoice.status === 'Pending' && (
                  <button 
                    onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'Approved')}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                  >
                    Одобри фактура
                  </button>
                )}
                {selectedInvoice.status === 'Approved' && (
                  <button 
                    onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'Paid')}
                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    Означи како платена
                  </button>
                )}
                <button 
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Затвори
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {isEditingInvoice && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Измени фактура</h3>
              <button onClick={() => setIsEditingInvoice(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Број на фактура</label>
                <input 
                  type="text" 
                  value={editingInvoiceData.invoice_number}
                  onChange={(e) => setEditingInvoiceData({...editingInvoiceData, invoice_number: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Вкупен промет (Бруто)</label>
                  <input 
                    type="number" 
                    value={editingInvoiceData.total_amount}
                    onChange={(e) => setEditingInvoiceData({...editingInvoiceData, total_amount: Number(e.target.value)})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">За исплата (Нето)</label>
                  <input 
                    type="number" 
                    value={editingInvoiceData.net_amount}
                    onChange={(e) => setEditingInvoiceData({...editingInvoiceData, net_amount: Number(e.target.value)})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Статус</label>
                <select 
                  value={editingInvoiceData.status}
                  onChange={(e) => setEditingInvoiceData({...editingInvoiceData, status: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="Draft">Нацрт</option>
                  <option value="Pending">Чека одобрување</option>
                  <option value="Approved">Одобрена</option>
                  <option value="Paid">Платена</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsEditingInvoice(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Откажи
                </button>
                <button 
                  onClick={handleUpdateInvoice}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                >
                  Зачувај
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Admin Modal */}
      {isHomeSliderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <LayoutDashboard className="text-orange-500" />
                {editingSliderItem ? 'Уреди слајд' : 'Додај нов слајд'}
              </h2>
              <button onClick={() => setIsHomeSliderModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveSliderItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Наслов (Title)</label>
                <textarea 
                  value={(editingSliderItem ? editingSliderItem.title : newSliderItem.title) || ''} 
                  onChange={e => editingSliderItem ? setEditingSliderItem({...editingSliderItem, title: e.target.value}) : setNewSliderItem({...newSliderItem, title: e.target.value})} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none min-h-[100px]" 
                  placeholder="Наслов на слајдот (поддржува HTML)..." 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Слика (URL)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    value={(editingSliderItem ? editingSliderItem.image_url : newSliderItem.image_url) || ''} 
                    onChange={e => editingSliderItem ? setEditingSliderItem({...editingSliderItem, image_url: e.target.value}) : setNewSliderItem({...newSliderItem, image_url: e.target.value})} 
                    className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                    placeholder="https://..." 
                  />
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                    <Upload size={18} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64 = reader.result as string;
                          if (editingSliderItem) setEditingSliderItem({...editingSliderItem, image_url: base64});
                          else setNewSliderItem({...newSliderItem, image_url: base64});
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Текст на копчето (CTA Text)</label>
                <input 
                  type="text" 
                  value={(editingSliderItem ? editingSliderItem.cta_text : newSliderItem.cta_text) || ''} 
                  onChange={e => editingSliderItem ? setEditingSliderItem({...editingSliderItem, cta_text: e.target.value}) : setNewSliderItem({...newSliderItem, cta_text: e.target.value})} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="Нарачај сега..." 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">CTA Линк</label>
                <input 
                  type="text" 
                  value={(editingSliderItem ? editingSliderItem.cta_link : newSliderItem.cta_link) || ''} 
                  onChange={e => editingSliderItem ? setEditingSliderItem({...editingSliderItem, cta_link: e.target.value}) : setNewSliderItem({...newSliderItem, cta_link: e.target.value})} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="/menu..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Редослед</label>
                  <input 
                    type="number" 
                    value={(editingSliderItem ? editingSliderItem.display_order : newSliderItem.display_order) ?? 0} 
                    onChange={e => editingSliderItem ? setEditingSliderItem({...editingSliderItem, display_order: parseInt(e.target.value) || 0}) : setNewSliderItem({...newSliderItem, display_order: parseInt(e.target.value) || 0})} 
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input 
                    type="checkbox" 
                    id="is_active_slider"
                    checked={editingSliderItem ? editingSliderItem.is_active === 1 : newSliderItem.is_active === 1} 
                    onChange={e => editingSliderItem ? setEditingSliderItem({...editingSliderItem, is_active: e.target.checked ? 1 : 0}) : setNewSliderItem({...newSliderItem, is_active: e.target.checked ? 1 : 0})} 
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="is_active_slider" className="text-sm font-bold text-slate-700">Активен</label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsHomeSliderModalOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                  Откажи
                </button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
                  Зачувај
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isCreateAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Креирај нов администратор</h3>
              <button onClick={() => setIsCreateAdminModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Целосно име</label>
                  <input 
                    type="text" 
                    required
                    value={newAdmin.name}
                    onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="пр. Петар Петров"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Е-маил</label>
                  <input 
                    type="email" 
                    required
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Корисничко име</label>
                  <input 
                    type="text" 
                    required
                    value={newAdmin.username}
                    onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Лозинка</label>
                  <input 
                    type="password" 
                    required
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Дозволи за пристап (Пермисии)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'dashboard', label: 'Дашборд' },
                    { id: 'restaurants', label: 'Ресторани' },
                    { id: 'database', label: 'База на податоци' },
                    { id: 'orders', label: 'Нарачки' },
                    { id: 'invoicing', label: 'Фактурирање' },
                    { id: 'delivery', label: 'Доставувачи' },
                    { id: 'marketing', label: 'Маркетинг' },
                    { id: 'campaigns', label: 'Кампањи' },
                    { id: 'billing', label: 'Исплати' },
                    { id: 'users', label: 'Корисници' },
                    { id: 'reviews', label: 'Рецензии' },
                    { id: 'settings', label: 'Поставки' },
                    { id: 'email', label: 'Е-маил' },
                    { id: 'admins', label: 'Администратори' }
                  ].map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newAdmin.permissions.includes(p.id)}
                        onChange={e => {
                          const perms = e.target.checked 
                            ? [...newAdmin.permissions, p.id]
                            : newAdmin.permissions.filter(x => x !== p.id);
                          setNewAdmin({...newAdmin, permissions: perms});
                        }}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700 font-medium">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateAdminModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Откажи
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Креирај Администратор
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Креирај нов корисник</h3>
              <button onClick={() => setIsCreateUserModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Целосно име</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="пр. Петар Петров"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Е-маил</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <p className="text-xs text-slate-500 italic">
                  * Корисникот ќе треба да се најави преку Google со овој е-маил за да го користи својот профил.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Откажи
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Креирај Корисник
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
