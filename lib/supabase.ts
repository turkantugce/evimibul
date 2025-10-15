import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '..'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Key are required')
}

// Singleton pattern - tek bir instance oluştur
let supabaseInstance: SupabaseClient | null = null

const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  }
  return supabaseInstance
}

export const supabase = getSupabaseClient()

// ============================================
// Database operations
// ============================================

export const db = {
  // Users operations
  users: {
    async create(user: any) {
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()
      
      if (error) throw error
      return data?.[0]
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },

    async getByEmail(email: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },

    async update(id: string, updates: any) {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data?.[0]
    },

    async search(query: string, limit: number = 20) {
      const searchLower = query.toLowerCase()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,username.ilike.%${searchLower}%`)
        .limit(limit)
      
      if (error) throw error
      return data || []
    },
  },

  // Listings operations
  listings: {
    async create(listing: any) {
      const { data, error } = await supabase
        .from('listings')
        .insert([listing])
        .select()
      
      if (error) throw error
      return data?.[0]
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },

    async getByOwnerId(ownerId: string) {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },

    async getActive(limit: number = 50) {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    },

    async update(id: string, updates: any) {
      const { data, error } = await supabase
        .from('listings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data?.[0]
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
  },

  // Conversations operations
  conversations: {
    async create(conversation: any) {
      const { data, error } = await supabase
        .from('conversations')
        .insert([conversation])
        .select()
      
      if (error) throw error
      return data?.[0]
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [userId])
        .order('last_message_time', { ascending: false, nullsFirst: false })
      
      if (error) throw error
      return data || []
    },

    async update(id: string, updates: any) {
      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data?.[0]
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
  },

  // Messages operations
  messages: {
    async create(message: any) {
      const { data, error } = await supabase
        .from('messages')
        .insert([message])
        .select()
      
      if (error) throw error
      return data?.[0]
    },

    async getByConversation(conversationId: string) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
      
      if (error) throw error
      return data || []
    },

    async markAsRead(conversationId: string, senderId: string) {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', senderId)
        .eq('read', false)
      
      if (error) throw error
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
  },
}

// ============================================
// Storage operations
// ============================================

export const storage = {
  // Genel storage fonksiyonları
  async upload(path: string, file: Blob, options?: any) {
    const { data, error } = await supabase.storage
      .from('images')
      .upload(path, file, options)
    return { data, error }
  },

  async getPublicUrl(path: string) {
    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(path)
    return data
  },

  async delete(paths: string[]) {
    const { data, error } = await supabase.storage
      .from('images')
      .remove(paths)
    return { data, error }
  },

  // Backward compatibility için eski fonksiyonlar
  listings: {
    async upload(fileName: string, file: Blob) {
      const { data, error } = await supabase.storage
        .from('listings-photos')
        .upload(fileName, file, { upsert: true })
      
      if (error) throw error
      return data
    },

    async getPublicUrl(fileName: string) {
      const { data } = supabase.storage
        .from('listings-photos')
        .getPublicUrl(fileName)
      
      return data.publicUrl
    },

    async delete(fileName: string) {
      const { error } = await supabase.storage
        .from('listings-photos')
        .remove([fileName])
      
      if (error) throw error
    },
  },

  profiles: {
    async upload(fileName: string, file: Blob) {
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true })
      
      if (error) throw error
      return data
    },

    async getPublicUrl(fileName: string) {
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName)
      
      return data.publicUrl
    },

    async delete(fileName: string) {
      const { error } = await supabase.storage
        .from('profiles')
        .remove([fileName])
      
      if (error) throw error
    },
  },
}

// ============================================
// Real-time subscriptions
// ============================================

// Aktif channel'ları takip et
const activeChannels = new Map<string, any>()

export const subscriptions = {
  /**
   * Dinamik olarak listings tablosundaki tüm değişiklikleri dinler.
   */
  onListingsChange(callback: any) {
    const channelName = 'listings-changes'
    
    // Eğer zaten varsa, eski channel'ı kaldır
    if (activeChannels.has(channelName)) {
      this.unsubscribe(activeChannels.get(channelName))
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        payload => callback(payload)
      )
      .subscribe()

    activeChannels.set(channelName, channel)
    return channel
  },

  /**
   * Belirli bir conversation_id'ye ait mesaj değişikliklerini dinler.
   */
  onMessagesChange(conversationId: string, callback: any) {
    const channelName = `messages-${conversationId}`
    
    // Eğer zaten varsa, eski channel'ı kaldır
    if (activeChannels.has(channelName)) {
      this.unsubscribe(activeChannels.get(channelName))
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => callback(payload)
      )
      .subscribe()

    activeChannels.set(channelName, channel)
    return channel
  },

  /**
   * Kullanıcının katıldığı konuşmalarda olan değişiklikleri dinler.
   */
  onConversationsChange(userId: string, callback: any) {
    const channelName = `conversations-${userId}`
    
    // Eğer zaten varsa, eski channel'ı kaldır
    if (activeChannels.has(channelName)) {
      this.unsubscribe(activeChannels.get(channelName))
    }
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload: {
          eventType: string
          new: Record<string, any> | null
          old: Record<string, any> | null
        }) => {
          const participants =
            (payload.new?.participants as string[] | undefined) ||
            (payload.old?.participants as string[] | undefined)

          if (participants?.includes(userId)) {
            callback(payload)
          }
        }
      )
      .subscribe()

    activeChannels.set(channelName, channel)
    return channel
  },

  /**
   * Aboneliği sonlandırmak için kullanılır.
   */
  unsubscribe(channel: any) {
    if (channel) {
      supabase.removeChannel(channel)
      // Map'ten de kaldır
      activeChannels.forEach((value, key) => {
        if (value === channel) {
          activeChannels.delete(key)
        }
      })
    }
  },
  
  /**
   * Tüm aktif channel'ları temizle
   */
  unsubscribeAll() {
    activeChannels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    activeChannels.clear()
  }
}

// ============================================
// Utility functions
// ============================================

/**
 * Supabase bağlantısını test et
 */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) throw error
    return { success: true, message: 'Supabase bağlantısı başarılı' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return { success: false, message: `Bağlantı hatası: ${errorMessage}` }
  }
}

/**
 * Auth state'i kontrol et
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return { session, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return { session: null, error: errorMessage }
  }
}

/**
 * Kullanıcı çıkış yap
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return { success: false, error: errorMessage }
  }
}
