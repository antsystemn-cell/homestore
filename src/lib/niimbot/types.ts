export interface NiimbotLabelData {
  order_no: string;
  customer_name: string;
  phone: string;
  phone2?: string;
  district: string;
  address: string;
  payment_status: string;
  payment_amount?: string;
  items: string;
  tracking_code?: string;
  note?: string;
}

export interface OrderLike {
  id: string;
  order_ref?: string | null;
  guest_name?: string | null;
  is_guest?: boolean | null;
  phone?: string | null;
  shipping_address?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  total?: number | null;
  delivery_order_id?: string | null;
  items?: unknown;
}
