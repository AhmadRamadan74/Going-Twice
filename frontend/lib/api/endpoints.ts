/**
 * Central place for API route paths.
 * Keep paths relative to the axios `baseURL` (`/api/v1`).
 */
export const endpoints = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    me: "/auth/me",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    sendVerification: "/auth/send-verification",
    verifyEmail: "/auth/verify-email",
  },
  products: {
    list: "/products",
    detail: (slug: string) => `/products/${slug}`,
    justListed: "/products/just-listed",
    editorsPicks: "/products/editors-picks",
  },
  categories: {
    list: "/categories",
    detail: (slug: string) => `/categories/${slug}`,
    create: "/categories",
    update: (id: number) => `/categories/${id}`,
    remove: (id: number) => `/categories/${id}`,
  },
  materials: {
    list: "/materials",
    create: "/materials",
    update: (id: number) => `/materials/${id}`,
    remove: (id: number) => `/materials/${id}`,
  },
  rooms: {
    list: "/rooms",
    detail: (slug: string) => `/rooms/${slug}`,
  },
  journal: {
    list: "/journal",
    detail: (slug: string) => `/journal/${slug}`,
  },
  faq: {
    list: "/faq",
  },
  contact: {
    messages: "/contact/messages",
  },
  newsletter: {
    subscribe: "/subscribers/subscribe",
  },
  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",
    readAll: "/notifications/read-all",
    read: (id: number) => `/notifications/${id}/read`,
  },
  messages: {
    conversations: "/messages/conversations",
    conversation: (id: number) => `/messages/conversations/${id}`,
    messages: (id: number) => `/messages/conversations/${id}/messages`,
    unreadCount: "/messages/unread-count",
  },
  cart: {
    root: "/cart",
    items: "/cart/items",
    item: (productId: number) => `/cart/items/${productId}`,
  },
  wishlist: {
    root: "/wishlist",
    item: (productId: number) => `/wishlist/${productId}`,
  },
  sell: {
    listPiece: "/sell/list",
    mine: "/sell/mine",
    detail: (id: number) => `/sell/${id}`,
    resubmit: (id: number) => `/sell/${id}/resubmit`,
  },
  admin: {
    dashboard: "/admin/dashboard",
    listings: "/admin/listings",
    listing: (id: number) => `/admin/listings/${id}`,
    approve: (id: number) => `/admin/listings/${id}/approve`,
    reject: (id: number) => `/admin/listings/${id}/reject`,
    orders: "/admin/orders",
  },
  orders: {
    checkout: "/orders/checkout",
    mine: "/orders",
    selling: "/orders/selling",
    detail: (id: number) => `/orders/${id}`,
    confirmPayment: (id: number) => `/orders/${id}/confirm-payment`,
    confirmHandover: (id: number) => `/orders/${id}/confirm-handover`,
    handover: (id: number) => `/orders/${id}/handover`,
  },
  uploads: {
    root: "/uploads",
    mainPhoto: "/uploads/main-photo",
  },
} as const;
