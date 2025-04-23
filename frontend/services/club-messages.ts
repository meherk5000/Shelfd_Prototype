import { api } from "../lib/api";
import axios from "axios";

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
    if (axios.isAxiosError(error)) {
      console.error('Axios error creating message:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        error: error.message,
        clubId,
        requestData: data,
        token: token ? 'present' : 'missing'
      });
      
      // If we have a detailed error message from the backend, use it
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
    } else {
      console.error('Non-Axios error creating message:', {
        error,
        clubId,
        requestData: data,
        token: token ? 'present' : 'missing'
      });
    }
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
    if (axios.isAxiosError(error)) {
      console.error('Axios error fetching messages:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        error: error.message,
        clubId,
        token: token ? 'present' : 'missing'
      });
      
      // If we have a detailed error message from the backend, use it
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
    } else {
      console.error('Non-Axios error fetching messages:', {
        error,
        clubId,
        token: token ? 'present' : 'missing'
      });
    }
    throw error;
  }
}; 