import { api } from "../lib/api";

export interface MessageCreate {
  content: string;
}

export interface MessageResponse {
  id: string;
  club_id: string;
  author_id: string;
  author_username: string;
  content: string;
  created_at: string;
}

export const createMessage = async (clubId: string, data: MessageCreate): Promise<MessageResponse> => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Not authenticated");
  }
  
  try {
    console.log('Creating message:', { clubId, data });
    const response = await api.post(`/api/clubs/${clubId}/messages`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Message created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating message:', {
      error,
      clubId,
      data,
      token: token ? 'present' : 'missing'
    });
    throw error;
  }
};

export const getMessages = async (clubId: string): Promise<MessageResponse[]> => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Not authenticated");
  }
  
  try {
    console.log('Fetching messages for club:', clubId);
    const response = await api.get(`/api/clubs/${clubId}/messages`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Messages fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', {
      error,
      clubId,
      token: token ? 'present' : 'missing'
    });
    throw error;
  }
}; 