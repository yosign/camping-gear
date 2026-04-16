import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tllpqdkixomfyhhbucsc.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export type CampRole = 'moku' | 'shuan' | ''

export type CampItem = {
  id: string
  name: string
  category: string
  note: string
  quantity: number       // 总数量
  claimed_moku: number   // 榫叔认领数量
  claimed_shuan: number  // 栓宝认领数量
  claimed_by: CampRole   // 兼容旧字段（单人全认领时使用）
  sort_order: number
  updated_at?: string
}

export const roleLabels: Record<Exclude<CampRole, ''>, string> = {
  moku: '榫叔',
  shuan: '栓宝',
}

export const roles: Exclude<CampRole, ''>[] = ['moku', 'shuan']

export const seedItems: Omit<CampItem, 'updated_at'>[] = [
  { id: 'tent', name: '帐篷', category: '大件装备', note: '优先确认搭建工具', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 10 },
  { id: 'canopy', name: '天幕', category: '大件装备', note: '含天幕杆和风绳', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 20 },
  { id: 'chairs', name: '露营椅', category: '大件装备', note: '按人数带', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 30 },
  { id: 'table', name: '折叠桌', category: '大件装备', note: '小桌即可', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 40 },
  { id: 'lamp', name: '营地灯', category: '照明电源', note: '含充电线', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 50 },
  { id: 'power', name: '户外电源', category: '照明电源', note: '可选', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 60 },
  { id: 'stove', name: '炉头', category: '做饭装备', note: '含点火器', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 70 },
  { id: 'pot', name: '锅具餐具', category: '做饭装备', note: '锅、碗、筷', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 80 },
  { id: 'water', name: '饮用水', category: '吃食补给', note: '建议单独统计', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 90 },
  { id: 'snacks', name: '零食', category: '吃食补给', note: '水果、薯片、坚果', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 100 },
  { id: 'bbq', name: '烤肉食材', category: '吃食补给', note: '肉串、调料', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 110 },
  { id: 'breakfast', name: '早餐食材', category: '吃食补给', note: '面包、牛奶、鸡蛋', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 120 },
  { id: 'medicine', name: '基础药品', category: '应急物资', note: '创可贴、驱蚊、退烧药', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 130 },
  { id: 'toys', name: '栓宝玩具', category: '亲子物资', note: '球、挖沙玩具、绘本', quantity: 1, claimed_moku: 0, claimed_shuan: 0, claimed_by: '', sort_order: 140 },
]
