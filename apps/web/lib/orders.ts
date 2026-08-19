export type MerchantContact = {
  wechat_id: string;
  qr_image_url: string | null;
  contact_note: string;
};

export type OrderSummary = {
  id: number;
  number: string;
  product_name: string;
  product_code: string;
  product_image_url: string | null;
  variant_name: string;
  quantity: number;
  reference_unit: number;
  reference_total: number;
  contact_phone: string;
  wechat_id: string | null;
  note: string | null;
  status: string;
  status_label: string;
  created_at: string;
};

export type OrderDetail = OrderSummary & {
  merchant_contact: MerchantContact;
};
