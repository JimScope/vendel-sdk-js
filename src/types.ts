export interface SendSMSRequest {
  recipients: string[];
  body: string;
  device_id?: string;
  group_ids?: string[];
}

export interface SendSMSTemplateRequest {
  recipients: string[];
  template_id: string;
  variables?: Record<string, string>;
  device_id?: string;
  group_ids?: string[];
}

export interface SendSMSResponse {
  batch_id: string;
  message_ids: string[];
  recipients_count: number;
  status: string;
}

export interface Quota {
  plan: string;
  sms_sent_this_month: number;
  max_sms_per_month: number;
  devices_registered: number;
  max_devices: number;
  reset_date: string;
}

export interface MessageStatus {
  id: string;
  batch_id: string;
  recipient: string;
  status: string;
  error_message: string;
  device_id: string;
  created: string;
  updated: string;
}

export interface BatchStatus {
  batch_id: string;
  total: number;
  status_counts: Record<string, number>;
  messages: MessageStatus[];
}

export interface Contact {
  id: string;
  name: string;
  phone_number: string;
  groups: string[];
  notes: string;
  created: string;
  updated: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  created: string;
  updated: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export interface VendelClientOptions {
  baseUrl: string;
  apiKey: string;
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
}
