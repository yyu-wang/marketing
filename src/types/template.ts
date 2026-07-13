export interface PromptTemplate {
  id: number;
  name: string;
  channel: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  channel: string;
  content: string;
}

export interface UpdateTemplatePayload {
  name?: string;
  channel?: string;
  content?: string;
}
