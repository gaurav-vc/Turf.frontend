import React, { useState, useEffect, useRef } from 'react'
import {
  Layout, Check, RefreshCw, Eye, Trash2,
  Image as ImageIcon,
  Grid, RotateCcw, Save, Shield,
  Sliders, AlignLeft, AlignCenter, AlignRight,
  Gavel, XCircle, Flame, ArrowUp, ArrowDown,
  Maximize2, Sparkles, Bookmark, BookmarkPlus, X, EyeOff, Clock,
  Video, Type, Plus, Upload, History, Move
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'
import { getTeamTheme, getTeamShortcut } from './teamThemeUtils'

interface AuctionPageDesignerProps {
  auctionId: string
  onBack?: () => void
}

export interface ActionButtonConfig {
  id: 'sold' | 'unsold' | 'custom_bid' | 'undo_sale' | 'undo_bid' | 'reset_bid'
  label: string
  visible: boolean
}

export const DEFAULT_ACTION_BUTTONS: ActionButtonConfig[] = [
  { id: 'sold', label: 'SOLD (Hammer Down)', visible: true },
  { id: 'unsold', label: 'UNSOLD', visible: true },
  { id: 'custom_bid', label: 'Custom Bid', visible: true },
  { id: 'undo_sale', label: 'Undo Sale', visible: true },
  { id: 'undo_bid', label: 'Undo Bid', visible: true },
  { id: 'reset_bid', label: 'Reset Bid', visible: true },
]

export interface ElementConfig {
  x: number
  y: number
  w: number
  h: number
  font_size?: number
  colour?: string
  font_family?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fit_to_size?: boolean
  show_team_logo?: boolean
  show_short_name?: boolean
  show_team_name?: boolean
  show_bid_amount?: boolean
  grid_rows?: number
  grid_cols?: number
  box_style?: 'solid' | 'outline'
  gap_x?: number
  gap_y?: number
  show_number?: boolean
  show_balance?: boolean
  align?: 'left' | 'center' | 'right'
  selected: boolean
  show_label?: boolean
  type?: 'standard' | 'photo' | 'video' | 'text' | 'bid_history' | 'action_bar' | 'top_bar' | 'franchise_stations'
  label?: string
  custom_label?: string
  title?: string
  media_url?: string
  video_url?: string
  custom_text?: string
  object_fit?: 'cover' | 'contain' | 'fill'
  border_radius?: number
  border_color?: string
  max_bids?: number
  panel_theme?: 'cyber' | 'glass' | 'solid'
}

export interface BrandingConfig {
  logo_count: number
  logo_size: number
  logo_position: 'left' | 'center' | 'right'
  title_text: string
  title_size: number
  title_colour: string
  title_image_url?: string
  remove_title_bg?: boolean
}

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  logo_count: 1,
  logo_size: 38,
  logo_position: 'center',
  title_text: 'Test Tournament',
  title_size: 26,
  title_colour: '#FFD54A',
  title_image_url: '',
  remove_title_bg: false,
}

export interface ZonesConfig {
  team_columns: number
  action_zone_width: number
  bid_history_width: number
  action_buttons?: ActionButtonConfig[]
  branding?: Partial<BrandingConfig>
}

export interface PageDesignState {
  version: number
  canvas_mode: 'professional' | 'compact'
  snap_grid: number
  grid_visible: boolean
  background_mode: string
  custom_background_url: string
  zones: ZonesConfig
  elements: Record<string, ElementConfig>
}

export const DEFAULT_PAGE_DESIGN: PageDesignState = {
  version: 4,
  canvas_mode: 'professional',
  snap_grid: 5,
  grid_visible: true,
  background_mode: 'stadium',
  custom_background_url: '',
  zones: {
    team_columns: 14,
    action_zone_width: 455,
    bid_history_width: 300,
    action_buttons: DEFAULT_ACTION_BUTTONS,
    branding: DEFAULT_BRANDING_CONFIG,
  },
  elements: {
    tournament_title: { x: 20, y: 2, w: 60, h: 7, font_size: 26, colour: '#FFD54A', bold: true, align: 'center', selected: true, show_label: false },
    player_category: { x: 20, y: 10, w: 60, h: 6, font_size: 22, colour: '#FFD54A', bold: true, align: 'center', selected: true, show_label: false },
    player_number: { x: 4, y: 10, w: 20, h: 5, font_size: 16, colour: '#B8C7DA', bold: true, align: 'left', selected: true, show_label: false },
    player_photo: { x: 4, y: 18, w: 28, h: 60, font_size: 14, colour: '#FFFFFF', bold: false, align: 'center', selected: true },
    player_name: { x: 35, y: 18, w: 58, h: 10, font_size: 42, colour: '#FFFFFF', bold: true, align: 'left', selected: true, show_label: false },
    role: { x: 35, y: 29, w: 28, h: 6, font_size: 18, colour: '#D8E2EF', bold: true, align: 'left', selected: true, show_label: false },
    batting_style: { x: 35, y: 37, w: 25, h: 6, font_size: 14, colour: '#FFFFFF', bold: false, align: 'left', selected: true, show_label: true },
    bowling_style: { x: 62, y: 37, w: 25, h: 6, font_size: 14, colour: '#FFFFFF', bold: false, align: 'left', selected: true, show_label: true },
    location: { x: 75, y: 37, w: 22, h: 6, font_size: 14, colour: '#FFFFFF', bold: false, align: 'left', selected: true, show_label: true },
    current_bid: { x: 35, y: 52, w: 34, h: 14, font_size: 46, colour: '#FFD54A', bold: true, align: 'left', selected: true, show_label: true },
    bidder_name: { x: 68, y: 52, w: 28, h: 8, font_size: 22, colour: '#FFFFFF', bold: true, align: 'right', selected: true, show_label: false },
    balance: { x: 68, y: 62, w: 28, h: 6, font_size: 14, colour: '#B9C7D7', bold: true, align: 'right', selected: true, show_label: true },
    max_bid: { x: 68, y: 70, w: 28, h: 6, font_size: 14, colour: '#FFFFFF', bold: true, align: 'right', selected: true, show_label: true },
    base_price: { x: 4, y: 80, w: 28, h: 7, font_size: 20, colour: '#FFFFFF', bold: true, align: 'center', selected: true, show_label: true },
    top_bar: { x: 2, y: 1.5, w: 96, h: 6.5, font_size: 13, colour: '#FFFFFF', selected: true, show_label: false },
    bid_history: { x: 74, y: 9.5, w: 24, h: 77, font_size: 12, colour: '#FFFFFF', selected: true, show_label: false, show_short_name: true, show_team_name: true, show_bid_amount: true },
    action_bar: { x: 2, y: 88, w: 96, h: 10, font_size: 12, colour: '#FFFFFF', selected: true, show_label: false },
    franchise_stations: { x: 2, y: 72, w: 96, h: 15, font_size: 14, colour: '#FFFFFF', selected: true, show_label: false, grid_rows: 2, grid_cols: 7, box_style: 'solid', gap_x: 6, gap_y: 6, show_number: true, show_short_name: true, show_balance: false },
  },
}

export interface ScreenTemplate {
  id: string
  name: string
  description: string
  badge: 'DEFAULT' | 'PRO' | 'CUSTOM'
  design: PageDesignState
  createdAt?: string
}

export const PRESET_TEMPLATES: ScreenTemplate[] = [
  {
    id: 'ipl-grand-stadium',
    name: 'IPL Grand Stadium (Official)',
    description: 'Iconic broadcast stadium layout with large photo, yellow current bid, and high-impact attributes.',
    badge: 'DEFAULT',
    design: DEFAULT_PAGE_DESIGN,
  },
  {
    id: 'pro-cricket-broadcast',
    name: 'Pro Cricket Broadcast Ticker',
    description: 'Television sports format with balanced side player frame, ticker stats, and prominent franchise bidder.',
    badge: 'PRO',
    design: {
      ...DEFAULT_PAGE_DESIGN,
      background_mode: 'classic_turf',
      elements: {
        ...DEFAULT_PAGE_DESIGN.elements,
        tournament_title: { x: 5, y: 3, w: 90, h: 8, font_size: 26, colour: '#FFD54A', bold: true, align: 'center', selected: true, show_label: false },
        player_photo: { x: 5, y: 15, w: 26, h: 58, font_size: 14, colour: '#FFFFFF', bold: false, align: 'center', selected: true },
        base_price: { x: 5, y: 76, w: 26, h: 8, font_size: 18, colour: '#FFFFFF', bold: true, align: 'center', selected: true, show_label: true },
        player_name: { x: 34, y: 15, w: 60, h: 10, font_size: 40, colour: '#FFFFFF', bold: true, align: 'left', selected: true, show_label: false },
        player_category: { x: 34, y: 27, w: 30, h: 6, font_size: 18, colour: '#38BDF8', bold: true, align: 'left', selected: true, show_label: true },
        role: { x: 66, y: 27, w: 28, h: 6, font_size: 18, colour: '#D8E2EF', bold: true, align: 'left', selected: true, show_label: true },
        batting_style: { x: 34, y: 36, w: 28, h: 6, font_size: 14, colour: '#FFFFFF', bold: false, align: 'left', selected: true, show_label: true },
        bowling_style: { x: 66, y: 36, w: 28, h: 6, font_size: 14, colour: '#FFFFFF', bold: false, align: 'left', selected: true, show_label: true },
        location: { x: 34, y: 44, w: 28, h: 6, font_size: 14, colour: '#FFFFFF', bold: false, align: 'left', selected: true, show_label: true },
        player_number: { x: 66, y: 44, w: 28, h: 6, font_size: 14, colour: '#B8C7DA', bold: true, align: 'left', selected: true, show_label: true },
        current_bid: { x: 34, y: 54, w: 60, h: 16, font_size: 52, colour: '#FFD54A', bold: true, align: 'left', selected: true, show_label: true },
        bidder_name: { x: 34, y: 74, w: 35, h: 8, font_size: 22, colour: '#34D399', bold: true, align: 'left', selected: true, show_label: true },
        balance: { x: 70, y: 74, w: 25, h: 6, font_size: 14, colour: '#B9C7D7', bold: true, align: 'right', selected: true, show_label: true },
        max_bid: { x: 70, y: 82, w: 25, h: 6, font_size: 14, colour: '#FFD54A', bold: true, align: 'right', selected: true, show_label: true },
      },
    },
  },
  {
    id: 'dark-neon-cyber',
    name: 'Dark Neon Cyber Arena',
    description: 'Electric cyan and neon amber palette with high-contrast borders and sharp modern hierarchy.',
    badge: 'PRO',
    design: {
      ...DEFAULT_PAGE_DESIGN,
      background_mode: 'dark_neon',
      elements: {
        ...DEFAULT_PAGE_DESIGN.elements,
        tournament_title: { x: 15, y: 3, w: 70, h: 7, font_size: 28, colour: '#38BDF8', bold: true, align: 'center', selected: true, show_label: false },
        player_photo: { x: 6, y: 15, w: 30, h: 62, font_size: 14, colour: '#38BDF8', bold: false, align: 'center', selected: true },
        base_price: { x: 6, y: 80, w: 30, h: 8, font_size: 20, colour: '#38BDF8', bold: true, align: 'center', selected: true, show_label: true },
        current_bid: { x: 40, y: 15, w: 55, h: 18, font_size: 54, colour: '#FFD54A', bold: true, align: 'left', selected: true, show_label: true },
        player_name: { x: 40, y: 35, w: 55, h: 12, font_size: 46, colour: '#FFFFFF', bold: true, align: 'left', selected: true, show_label: false },
        player_category: { x: 40, y: 49, w: 26, h: 6, font_size: 18, colour: '#34D399', bold: true, align: 'left', selected: true, show_label: false },
        role: { x: 68, y: 49, w: 26, h: 6, font_size: 18, colour: '#38BDF8', bold: true, align: 'left', selected: true, show_label: false },
        batting_style: { x: 40, y: 58, w: 26, h: 6, font_size: 14, colour: '#E2E8F0', bold: false, align: 'left', selected: true, show_label: true },
        bowling_style: { x: 68, y: 58, w: 26, h: 6, font_size: 14, colour: '#E2E8F0', bold: false, align: 'left', selected: true, show_label: true },
        location: { x: 40, y: 66, w: 26, h: 6, font_size: 14, colour: '#E2E8F0', bold: false, align: 'left', selected: true, show_label: true },
        player_number: { x: 68, y: 66, w: 26, h: 6, font_size: 14, colour: '#E2E8F0', bold: true, align: 'left', selected: true, show_label: true },
        bidder_name: { x: 40, y: 76, w: 55, h: 9, font_size: 24, colour: '#38BDF8', bold: true, align: 'left', selected: true, show_label: true },
        balance: { x: 40, y: 87, w: 26, h: 6, font_size: 14, colour: '#34D399', bold: true, align: 'left', selected: true, show_label: true },
        max_bid: { x: 68, y: 87, w: 26, h: 6, font_size: 14, colour: '#FFD54A', bold: true, align: 'left', selected: true, show_label: true },
      },
    },
  },
  {
    id: 'minimal-focus',
    name: 'Minimal Focus Arena',
    description: 'Ultra-clean, uncluttered stage focused exclusively on the player photo, name, and live bid battle.',
    badge: 'PRO',
    design: {
      ...DEFAULT_PAGE_DESIGN,
      background_mode: 'stadium',
      elements: {
        ...DEFAULT_PAGE_DESIGN.elements,
        tournament_title: { x: 10, y: 4, w: 80, h: 6, font_size: 22, colour: '#94A3B8', bold: true, align: 'center', selected: true, show_label: false },
        player_photo: { x: 8, y: 14, w: 32, h: 66, font_size: 14, colour: '#FFFFFF', bold: false, align: 'center', selected: true },
        base_price: { x: 8, y: 83, w: 32, h: 8, font_size: 20, colour: '#E2E8F0', bold: true, align: 'center', selected: true, show_label: true },
        player_name: { x: 44, y: 16, w: 50, h: 12, font_size: 46, colour: '#FFFFFF', bold: true, align: 'left', selected: true, show_label: false },
        player_category: { x: 44, y: 29, w: 50, h: 6, font_size: 20, colour: '#F59E0B', bold: true, align: 'left', selected: true, show_label: false },
        current_bid: { x: 44, y: 40, w: 50, h: 18, font_size: 56, colour: '#FDE047', bold: true, align: 'left', selected: true, show_label: true },
        bidder_name: { x: 44, y: 62, w: 50, h: 10, font_size: 26, colour: '#60A5FA', bold: true, align: 'left', selected: true, show_label: true },
        balance: { x: 44, y: 74, w: 24, h: 6, font_size: 15, colour: '#34D399', bold: true, align: 'left', selected: true, show_label: true },
        max_bid: { x: 70, y: 74, w: 24, h: 6, font_size: 15, colour: '#FDE047', bold: true, align: 'left', selected: true, show_label: true },
        role: { x: 44, y: 83, w: 24, h: 6, font_size: 14, colour: '#94A3B8', bold: false, align: 'left', selected: true, show_label: false },
        location: { x: 70, y: 83, w: 24, h: 6, font_size: 14, colour: '#94A3B8', bold: false, align: 'left', selected: true, show_label: false },
        batting_style: { ...DEFAULT_PAGE_DESIGN.elements.batting_style, selected: false },
        bowling_style: { ...DEFAULT_PAGE_DESIGN.elements.bowling_style, selected: false },
        player_number: { ...DEFAULT_PAGE_DESIGN.elements.player_number, selected: false },
      },
    },
  },
]

const ELEMENT_LABELS: Record<string, { label: string; fieldNameDefault: boolean }> = {
  tournament_title: { label: 'Tournament Title & Logo', fieldNameDefault: false },
  player_number: { label: 'Player Number', fieldNameDefault: false },
  player_name: { label: 'Player Name', fieldNameDefault: false },
  player_category: { label: 'Player Category', fieldNameDefault: false },
  base_price: { label: 'Base Price', fieldNameDefault: true },
  player_photo: { label: 'Player Photo', fieldNameDefault: false },
  role: { label: 'Role', fieldNameDefault: false },
  batting_style: { label: 'Batting Style', fieldNameDefault: true },
  bowling_style: { label: 'Bowling Style', fieldNameDefault: true },
  location: { label: 'Location', fieldNameDefault: true },
  current_bid: { label: 'Current Bid Amount', fieldNameDefault: true },
  bidder_name: { label: 'Bidder Team Name', fieldNameDefault: false },
  balance: { label: 'Kitty Balance', fieldNameDefault: true },
  max_bid: { label: 'Max Bid Allowed', fieldNameDefault: true },
  top_bar: { label: 'Top Arena Status Bar', fieldNameDefault: false },
  bid_history: { label: 'Bid History Stream Panel', fieldNameDefault: false },
  action_bar: { label: 'Live Action Controls (SOLD / UNSOLD)', fieldNameDefault: false },
  franchise_stations: { label: 'Franchise Bidding Stations', fieldNameDefault: false },
}

const SAMPLE_FRANCHISE_TEAMS = [
  { id: 1, name: 'Super Kings', code: 'SK', color: '#EAB308', balance: '₹1,25,00,000' },
  { id: 2, name: 'Hyderabad Sun', code: 'HS', color: '#F97316', balance: '₹1,25,00,000' },
  { id: 3, name: 'United Challengers', code: 'UC', color: '#EF4444', balance: '₹1,12,00,000' },
  { id: 4, name: 'X-Warriors', code: 'XW', color: '#8B5CF6', balance: '₹1,25,00,000' },
  { id: 5, name: '4 The Legends', code: '4TL', color: '#10B981', balance: '₹1,25,00,000' },
  { id: 6, name: 'Undisputed', code: 'UND', color: '#F59E0B', balance: '₹1,25,00,000' },
  { id: 7, name: 'Light Design', code: 'LDS', color: '#06B6D4', balance: '₹1,25,00,000' },
  { id: 8, name: 'Farm Royals', code: 'FR', color: '#3B82F6', balance: '₹1,25,00,000' },
  { id: 9, name: 'Invincible XI', code: 'IVW', color: '#6366F1', balance: '₹1,25,00,000' },
  { id: 10, name: 'Mehta Mave', code: 'MM', color: '#14B8A6', balance: '₹1,25,00,000' },
  { id: 11, name: 'Super All', code: 'SA', color: '#0EA5E9', balance: '₹1,10,00,000' },
  { id: 12, name: 'Kings Bull', code: 'IK', color: '#EC4899', balance: '₹1,25,00,000' },
  { id: 13, name: 'Titans Target', code: 'TT', color: '#A855F7', balance: '₹93,00,000' },
  { id: 14, name: 'Striker Team', code: 'ST', color: '#F43F5E', balance: '₹77,00,000' },
]

export default function AuctionPageDesigner({ auctionId, onBack }: AuctionPageDesignerProps) {
  const [design, setDesign] = useState<PageDesignState>(DEFAULT_PAGE_DESIGN)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>('tournament_title')
  const [activeSection, setActiveSection] = useState<
    'screen_elements' | 'canvas' | 'zones' | 'hammer' | 'branding' | 'background'
  >('screen_elements')
  const [samplePlayerData, setSamplePlayerData] = useState<any>({
    player_name: 'gfderhtyjj',
    player_number: '#1',
    category: 'BATSMEN',
    role: 'Application',
    batting_style: 'Right Hand',
    bowling_style: 'Right arm',
    location: 'Mumbai, Maharashtra',
    base_price: 500000,
    current_bid: 400000,
    bidder_name: 'CYCLONE',
    balance: 56000000,
    max_bid: 42000000,
    photo_url: '',
  })

  // Dragging & Resizing State with initial values
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    isDragging: boolean
    isResizing: boolean
    resizeDirection: string | null
    key: string
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
    origFontSize: number
  } | null>(null)

  const titleFileInputRef = useRef<HTMLInputElement>(null)
  const bgFileInputRef = useRef<HTMLInputElement>(null)
  const customMediaInputRef = useRef<HTMLInputElement>(null)
  const [customMediaTypeToUpload, setCustomMediaTypeToUpload] = useState<'image' | 'video'>('image')
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ key: string; type: 'image' | 'video' } | null>(null)
  const [uploadingTitleImage, setUploadingTitleImage] = useState(false)
  const [uploadingBgImage, setUploadingBgImage] = useState(false)

  // Direct media upload trigger for any custom or standard box
  const triggerBoxMediaUpload = (key: string, type: 'image' | 'video') => {
    setActiveUploadTarget({ key, type })
    setSelectedKey(key)
    if (customMediaInputRef.current) {
      customMediaInputRef.current.accept = type === 'video' ? 'video/*' : 'image/*'
      customMediaInputRef.current.click()
    }
  }

  // Handlers for User-Added Custom Boxes (Photo, Video, Text, Bid History, Action Bar)
  const handleAddCustomBox = (type: 'photo' | 'video' | 'text' | 'bid_history' | 'action_bar') => {
    if (type === 'action_bar') {
      setDesign((prev) => {
        const copy = { ...prev, elements: { ...prev.elements } }
        const existing = copy.elements.action_bar || DEFAULT_PAGE_DESIGN.elements.action_bar || {
          x: 2, y: 88, w: 96, h: 10, font_size: 12, colour: '#FFFFFF', selected: true, show_label: false
        }
        copy.elements.action_bar = {
          ...existing,
          selected: true,
          type: 'action_bar',
          label: existing.label || 'Live Action Controls (SOLD / UNSOLD)',
        }
        return copy
      })
      setSelectedKey('action_bar')
      if (canvasRef.current) {
        canvasRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    if (type === 'bid_history') {
      setDesign((prev) => {
        const copy = { ...prev, elements: { ...prev.elements } }
        const existing = copy.elements.bid_history || DEFAULT_PAGE_DESIGN.elements.bid_history || {
          x: 74, y: 9.5, w: 24, h: 77, font_size: 12, colour: '#FFFFFF', selected: true, show_label: false
        }
        copy.elements.bid_history = {
          ...existing,
          selected: true,
          type: 'bid_history',
          label: existing.label || 'Bid History Stream Panel',
          title: existing.title || 'BID HISTORY',
          panel_theme: existing.panel_theme || 'cyber',
          max_bids: existing.max_bids || 8,
        }
        return copy
      })
      setSelectedKey('bid_history')
      return
    }

    const id = `custom_${type}_${Date.now()}`
    const defaultLabels: Record<string, string> = {
      photo: 'Custom Photo Banner',
      video: 'Custom Video Stream',
      text: 'Custom Announcement Text',
    }
    const newEl: ElementConfig = {
      x: 35,
      y: 38,
      w: type === 'photo' || type === 'video' ? 32 : 28,
      h: type === 'photo' || type === 'video' ? 24 : 8,
      font_size: 18,
      colour: '#FFFFFF',
      bold: true,
      align: 'center',
      selected: true,
      show_label: false,
      type,
      label: defaultLabels[type] || 'Custom Box',
      media_url: '',
      video_url: '',
      custom_text: type === 'text' ? 'NEW ANNOUNCEMENT' : undefined,
      object_fit: 'cover',
      border_radius: 12,
    }
    setDesign((prev) => ({
      ...prev,
      elements: {
        ...prev.elements,
        [id]: newEl,
      },
    }))
    setSelectedKey(id)
  }

  // HTML5 Drag & Drop from Sidebar / Preview to Canvas Stage
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState<boolean>(false)

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOverCanvas(false)
    const elKey = e.dataTransfer.getData('application/turf-element') || e.dataTransfer.getData('text/plain')
    if (!elKey) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return

    // Calculate percentage coordinates based on mouse drop location
    let dropX = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    let dropY = Math.round(((e.clientY - rect.top) / rect.height) * 100)

    // Snap to grid
    const snap = design.snap_grid || 2
    dropX = snapVal(dropX, snap)
    dropY = snapVal(dropY, snap)

    if (elKey === 'action_bar') {
      setDesign((prev) => {
        const copy = { ...prev, elements: { ...prev.elements } }
        const existing = copy.elements.action_bar || DEFAULT_PAGE_DESIGN.elements.action_bar || {
          x: 2, y: 88, w: 96, h: 10, font_size: 12, colour: '#FFFFFF', selected: true, show_label: false
        }
        const w = existing.w || 96
        const h = existing.h || 10
        copy.elements.action_bar = {
          ...existing,
          x: Math.max(0, Math.min(100 - w, dropX)),
          y: Math.max(0, Math.min(100 - h, dropY)),
          selected: true,
          type: 'action_bar',
          label: existing.label || 'Live Action Controls (SOLD / UNSOLD)',
        }
        return copy
      })
      setSelectedKey('action_bar')
      return
    }

    if (elKey === 'bid_history') {
      setDesign((prev) => {
        const copy = { ...prev, elements: { ...prev.elements } }
        const existing = copy.elements.bid_history || DEFAULT_PAGE_DESIGN.elements.bid_history || {
          x: 74, y: 9.5, w: 24, h: 77, font_size: 12, colour: '#FFFFFF', selected: true, show_label: false
        }
        const w = existing.w || 24
        const h = existing.h || 77
        copy.elements.bid_history = {
          ...existing,
          x: Math.max(0, Math.min(100 - w, dropX)),
          y: Math.max(0, Math.min(100 - h, dropY)),
          selected: true,
          type: 'bid_history',
          label: existing.label || 'Bid History Stream Panel',
        }
        return copy
      })
      setSelectedKey('bid_history')
      return
    }

    if (elKey === 'photo' || elKey === 'video' || elKey === 'text') {
      const id = `custom_${elKey}_${Date.now()}`
      const w = elKey === 'photo' || elKey === 'video' ? 32 : 28
      const h = elKey === 'photo' || elKey === 'video' ? 24 : 8
      const newEl: ElementConfig = {
        x: Math.max(0, Math.min(100 - w, dropX)),
        y: Math.max(0, Math.min(100 - h, dropY)),
        w,
        h,
        font_size: 18,
        colour: '#FFFFFF',
        bold: true,
        align: 'center',
        selected: true,
        show_label: false,
        type: elKey,
        label: elKey === 'photo' ? 'Custom Photo Banner' : elKey === 'video' ? 'Custom Video Stream' : 'Custom Announcement Text',
        custom_text: elKey === 'text' ? 'NEW ANNOUNCEMENT' : undefined,
        object_fit: 'cover',
        border_radius: 12,
      }
      setDesign((prev) => ({
        ...prev,
        elements: {
          ...prev.elements,
          [id]: newEl,
        },
      }))
      setSelectedKey(id)
      return
    }

    // Standard elements from ELEMENT_LABELS
    if (design.elements[elKey] || ELEMENT_LABELS[elKey]) {
      setDesign((prev) => {
        const cur = prev.elements[elKey] || DEFAULT_PAGE_DESIGN.elements[elKey] || {
          x: 4, y: 20, w: 25, h: 6, font_size: 14, colour: '#FFFFFF', selected: true
        }
        const w = cur.w || 25
        const h = cur.h || 6
        return {
          ...prev,
          elements: {
            ...prev.elements,
            [elKey]: {
              ...cur,
              x: Math.max(0, Math.min(100 - w, dropX)),
              y: Math.max(0, Math.min(100 - h, dropY)),
              selected: true,
            },
          },
        }
      })
      setSelectedKey(elKey)
    }
  }

  const handleDeleteCustomBox = (key: string) => {
    setDesign((prev) => {
      const copy = { ...prev, elements: { ...prev.elements } }
      delete copy.elements[key]
      return copy
    })
    if (selectedKey === key) {
      setSelectedKey(null)
    }
  }

  const handleCustomMediaFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetKey = activeUploadTarget?.key || selectedKey
    if (!file || !targetKey) return

    const isVideo = file.type.startsWith('video/')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const result = reader.result
        setDesign((prev) => {
          const copy = { ...prev, elements: { ...prev.elements } }
          const cur = copy.elements[targetKey]
          if (!cur) return prev
          copy.elements[targetKey] = {
            ...cur,
            media_url: result,
            video_url: isVideo ? result : cur.video_url,
          }
          return copy
        })
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Full Screen Arena vs Standard View Toggle
  const [previewArenaMode, setPreviewArenaMode] = useState<boolean>(true)

  // Templates Management State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default-arena')
  const [liveTeams, setLiveTeams] = useState<any[]>([])
  const [previewStationFeedback, setPreviewStationFeedback] = useState<string | null>(null)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false)
  const [newTemplateName, setNewTemplateName] = useState<string>('')
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null)
  const [customTemplates, setCustomTemplates] = useState<ScreenTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('turf_auction_screen_templates_v1')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const saveCustomTemplatesToStorage = (templates: ScreenTemplate[]) => {
    setCustomTemplates(templates)
    try {
      localStorage.setItem('turf_auction_screen_templates_v1', JSON.stringify(templates))
    } catch (e) {
      console.warn('Could not save custom templates to storage', e)
    }
  }

  const handleApplyTemplate = (tpl: ScreenTemplate) => {
    setSelectedTemplateId(tpl.id)
    const existingTitle = design.zones?.branding?.title_text
    const tplBranding = tpl.design.zones?.branding
    const mergedBranding: BrandingConfig = {
      ...DEFAULT_BRANDING_CONFIG,
      ...(tplBranding || {}),
      title_text: existingTitle || tplBranding?.title_text || 'Test Tournament',
    }

    setDesign({
      ...tpl.design,
      zones: {
        ...tpl.design.zones,
        branding: mergedBranding,
      },
    })
    setTemplateFeedback(`Applied template: "${tpl.name}"`)
    setTimeout(() => setTemplateFeedback(null), 3000)
    setIsTemplateModalOpen(false)
  }

  const handleSaveAsTemplate = () => {
    const name = newTemplateName.trim()
    if (!name) return
    const newTpl: ScreenTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description: `Custom screen layout saved on ${new Date().toLocaleDateString()}`,
      badge: 'CUSTOM',
      design: JSON.parse(JSON.stringify(design)),
      createdAt: new Date().toISOString(),
    }
    const updated = [newTpl, ...customTemplates]
    saveCustomTemplatesToStorage(updated)
    setNewTemplateName('')
    setTemplateFeedback(`Saved "${name}" to your Screen Templates!`)
    setTimeout(() => setTemplateFeedback(null), 3000)
  }

  const handleDeleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter((t) => t.id !== id)
    saveCustomTemplatesToStorage(updated)
    setTemplateFeedback('Template deleted.')
    setTimeout(() => setTemplateFeedback(null), 2500)
  }

  // 1. Initial Load
  useEffect(() => {
    fetchDesignAndSampleData()
  }, [auctionId])

  const fetchDesignAndSampleData = async () => {
    setLoading(true)
    try {
      // 1. Fetch saved layout design
      try {
        const res = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
        const data = res.data?.design_json || res.data
        if (data && data.elements) {
          const loadedElements = {
            ...DEFAULT_PAGE_DESIGN.elements,
            ...data.elements,
          }
          if (!loadedElements.tournament_title) {
            loadedElements.tournament_title = { ...DEFAULT_PAGE_DESIGN.elements.tournament_title }
          }

          const loadedButtons = data.zones?.action_buttons
          let mergedButtons: ActionButtonConfig[] = DEFAULT_ACTION_BUTTONS
          if (Array.isArray(loadedButtons) && loadedButtons.length > 0) {
            const existingIds = new Set(loadedButtons.map((b: any) => b.id))
            const missing = DEFAULT_ACTION_BUTTONS.filter((d) => !existingIds.has(d.id))
            mergedButtons = [...loadedButtons, ...missing]
          }

          setDesign({
            ...DEFAULT_PAGE_DESIGN,
            ...data,
            zones: {
              ...DEFAULT_PAGE_DESIGN.zones,
              ...(data.zones || {}),
              action_buttons: mergedButtons,
              branding: {
                ...DEFAULT_PAGE_DESIGN.zones.branding,
                ...(data.zones?.branding || {}),
              },
            },
            elements: loadedElements,
          })
        }
      } catch (designErr) {
        console.warn('Using existing/cached design template', designErr)
      }

      // 2. Fetch live tournament active player & teams (isolated try/catch so it NEVER overwrites design!)
      try {
        const stateRes = await apiClient.get(`/v1/auction/console/${auctionId}/live_state/`)
        if (stateRes.data?.teams && Array.isArray(stateRes.data.teams)) {
          setLiveTeams(stateRes.data.teams)
        }
        if (stateRes.data?.active_player) {
          const p = stateRes.data.active_player
          setSamplePlayerData((prev: any) => ({
            ...prev,
            player_name: p.player_name || prev.player_name,
            player_number: p.serial_no ? `#${p.serial_no}` : prev.player_number,
            category: (p.category || prev.category).toUpperCase(),
            role: p.role || prev.role,
            batting_style: p.batting_style || prev.batting_style,
            bowling_style: p.bowling_style || prev.bowling_style,
            location: p.location || prev.location,
            base_price: p.base_price || prev.base_price,
            photo_url: p.photo_url || prev.photo_url,
            current_bid: stateRes.data.current_bid || prev.current_bid,
            bidder_name: stateRes.data.highest_bid?.team_name || prev.bidder_name,
          }))
        }
      } catch (playerErr) {
        console.info('Live player fetch optional for preview', playerErr)
      }
    } finally {
      setLoading(false)
    }
  }

  // 2. Save Design to Backend
  const handleSaveDesign = async () => {
    setSaving(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, {
        design_json: design,
      })
      if (res.data?.design_json) {
        setDesign((prev) => ({
          ...prev,
          ...res.data.design_json,
        }))
      }
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err) {
      console.error('Failed to save page design', err)
    } finally {
      setSaving(false)
    }
  }

  // 3. Reset to Default Template
  const handleResetDefault = async () => {
    if (!window.confirm('Reset this design to default professional auction template?')) return
    setSaving(true)
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, { action: 'reset' })
      setDesign(DEFAULT_PAGE_DESIGN)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
    } catch (err) {
      console.error('Reset failed', err)
    } finally {
      setSaving(false)
    }
  }

  // Action Button Controls Helpers
  const currentActionButtons = design.zones?.action_buttons || DEFAULT_ACTION_BUTTONS

  const handleMoveActionButton = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentActionButtons.length) return
    const newButtons = [...currentActionButtons]
    const [moved] = newButtons.splice(index, 1)
    newButtons.splice(targetIndex, 0, moved)
    setDesign((prev) => ({
      ...prev,
      zones: {
        ...prev.zones,
        action_buttons: newButtons,
      },
    }))
  }

  const handleToggleActionButtonVisibility = (id: string) => {
    const newButtons = currentActionButtons.map((btn) =>
      btn.id === id ? { ...btn, visible: !btn.visible } : btn
    )
    setDesign((prev) => ({
      ...prev,
      zones: {
        ...prev.zones,
        action_buttons: newButtons,
      },
    }))
  }

  const handleUpdateActionButtonLabel = (id: string, newLabel: string) => {
    const newButtons = currentActionButtons.map((btn) =>
      btn.id === id ? { ...btn, label: newLabel } : btn
    )
    setDesign((prev) => ({
      ...prev,
      zones: {
        ...prev.zones,
        action_buttons: newButtons,
      },
    }))
  }

  const handleResetActionButtons = () => {
    setDesign((prev) => ({
      ...prev,
      zones: {
        ...prev.zones,
        action_buttons: DEFAULT_ACTION_BUTTONS,
      },
    }))
  }

  // 4. Snap to Grid helper
  const snapVal = (val: number, step: number) => {
    if (!step || step <= 1) return Math.round(val)
    return Math.round(val / step) * step
  }

  // 5. Drag & Resize Engine
  const handleMouseDown = (e: React.MouseEvent, key: string, resizeDir: string | null = null) => {
    e.stopPropagation()
    if (resizeDir) {
      e.preventDefault()
    }

    setSelectedKey(key)
    const el = design.elements[key]
    if (!el) return

    dragRef.current = {
      isDragging: !resizeDir,
      isResizing: Boolean(resizeDir),
      resizeDirection: resizeDir,
      key,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.w,
      origH: el.h,
      origFontSize: el.font_size || 20,
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current || !canvasRef.current) return
    const { isDragging, isResizing, resizeDirection, key, startX, startY, origX, origY, origW, origH, origFontSize } = dragRef.current
    const rect = canvasRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const deltaXPercent = ((e.clientX - startX) / rect.width) * 100
    const deltaYPercent = ((e.clientY - startY) / rect.height) * 100
    const snap = design.snap_grid || 5

    setDesign((prev) => {
      const copy = { ...prev, elements: { ...prev.elements } }
      const el = { ...copy.elements[key] }
      if (!el) return prev

      if (isDragging) {
        let newX = origX + deltaXPercent
        let newY = origY + deltaYPercent

        newX = snapVal(newX, snap)
        newY = snapVal(newY, snap)

        // Bounds clamping
        newX = Math.max(0, Math.min(100 - el.w, newX))
        newY = Math.max(0, Math.min(100 - el.h, newY))

        el.x = newX
        el.y = newY
      } else if (isResizing && resizeDirection) {
        let newX = origX
        let newY = origY
        let newW = origW
        let newH = origH

        if (resizeDirection.includes('e')) {
          newW = snapVal(origW + deltaXPercent, snap)
        }
        if (resizeDirection.includes('s')) {
          newH = snapVal(origH + deltaYPercent, snap)
        }
        if (resizeDirection.includes('w')) {
          const rawW = origW - deltaXPercent
          newW = snapVal(rawW, snap)
          newX = snapVal(origX + (origW - newW), snap)
        }
        if (resizeDirection.includes('n')) {
          const rawH = origH - deltaYPercent
          newH = snapVal(rawH, snap)
          newY = snapVal(origY + (origH - newH), snap)
        }

        // Min dimensions
        newW = Math.max(5, Math.min(100 - newX, newW))
        newH = Math.max(3, Math.min(100 - newY, newH))
        newX = Math.max(0, newX)
        newY = Math.max(0, newY)

        el.x = newX
        el.y = newY
        el.w = newW
        el.h = newH

        // Immediate proportional font scaling when making element bigger or smaller!
        if (origFontSize) {
          const scaleW = newW / origW
          const scaleH = newH / origH
          const scale = Math.max(scaleW, scaleH)
          const newSize = Math.max(10, Math.min(96, Math.round(origFontSize * scale)))
          el.font_size = newSize

          if (key === 'tournament_title' && copy.zones?.branding) {
            copy.zones.branding = {
              ...copy.zones.branding,
              title_size: newSize,
            }
          }
        }
      }

      copy.elements[key] = el
      return copy
    })
  }

  const handleMouseUp = () => {
    dragRef.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  // 6. Element Toggle & Settings
  const toggleElementSelected = (key: string) => {
    setDesign((prev) => {
      const copy = { ...prev, elements: { ...prev.elements } }
      const fallback = DEFAULT_PAGE_DESIGN.elements[key] || {
        x: 20, y: 20, w: 30, h: 8, font_size: 18, colour: '#FFFFFF', selected: false, show_label: false
      }
      const current = copy.elements[key] || fallback
      copy.elements[key] = {
        ...current,
        selected: !current.selected,
      }
      return copy
    })
    setSelectedKey(key)
  }

  const updateElementProp = (key: string, prop: keyof ElementConfig, value: any) => {
    setDesign((prev) => {
      const copy = { ...prev, elements: { ...prev.elements } }
      if (!copy.elements[key]) return prev
      copy.elements[key] = {
        ...copy.elements[key],
        [prop]: value,
      }
      return copy
    })
  }

  const nudgeElement = (key: string, dx: number, dy: number) => {
    setDesign((prev) => {
      const copy = { ...prev, elements: { ...prev.elements } }
      const el = copy.elements[key]
      if (!el) return prev
      copy.elements[key] = {
        ...el,
        x: Math.max(0, Math.min(100 - el.w, Math.round(el.x + dx))),
        y: Math.max(0, Math.min(100 - el.h, Math.round(el.y + dy))),
      }
      return copy
    })
  }

  const toggleElementLabel = (key: string) => {
    setDesign((prev) => {
      const copy = { ...prev, elements: { ...prev.elements } }
      if (copy.elements[key]) {
        copy.elements[key] = {
          ...copy.elements[key],
          show_label: !copy.elements[key].show_label,
        }
      }
      return copy
    })
  }

  const handleDeleteSelected = () => {
    if (!selectedKey) return
    setDesign((prev) => {
      const copy = { ...prev, elements: { ...prev.elements } }
      if (copy.elements[selectedKey]) {
        copy.elements[selectedKey] = {
          ...copy.elements[selectedKey],
          selected: false,
        }
      }
      return copy
    })
    setSelectedKey(null)
  }

  // 7. Image Uploads
  const handleUploadTournamentImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingTitleImage(true)
    try {
      const formData = new FormData()
      formData.append('tournament_image', file)
      formData.append('remove_title_bg', String(design.zones?.branding?.remove_title_bg || false))
      formData.append('design_json', JSON.stringify(design))

      const res = await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.design_json) {
        setDesign(res.data.design_json)
      }
    } catch (err) {
      console.error('Failed to upload tournament branding image', err)
    } finally {
      setUploadingTitleImage(false)
    }
  }

  const handleUploadBackgroundImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBgImage(true)
    try {
      const formData = new FormData()
      formData.append('background_image', file)
      formData.append('design_json', JSON.stringify(design))

      const res = await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.design_json) {
        setDesign(res.data.design_json)
      }
    } catch (err) {
      console.error('Failed to upload background image', err)
    } finally {
      setUploadingBgImage(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-amber-500" />
        <span className="font-bold text-sm text-slate-400">Loading Auction Page Studio...</span>
      </div>
    )
  }

  const branding = design.zones?.branding || {
    logo_count: 1,
    logo_size: 38,
    logo_position: 'center',
    title_text: 'Test Tournament',
    title_size: 26,
    title_colour: '#FFD54A',
    title_image_url: '',
    remove_title_bg: false,
  }

  const selectedCount = Object.values(design.elements).filter((el) => el.selected).length

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="text-xs font-bold text-slate-500 hover:text-foreground transition-colors"
              >
                ← Back to Auction Setup
              </button>
            )}
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Canvas Customizer</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layout className="h-6 w-6 text-amber-500" />
            Auction Page Design
          </h1>
          <p className="text-xs text-muted-foreground">
            Design the live auction once. Every text and element can be moved and dragged to make it small or big.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Auction Screen Layout Dropdown */}
          <div className="flex items-center gap-1.5 bg-muted/60 border border-border px-3 py-1.5 rounded-xl shadow-2xs">
            <Layout className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">Screen:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const targetId = e.target.value
                const allTemplates = [...PRESET_TEMPLATES, ...customTemplates]
                const tpl = allTemplates.find((t) => t.id === targetId)
                if (tpl) {
                  handleApplyTemplate(tpl)
                }
              }}
              className="bg-transparent text-foreground font-black text-xs cursor-pointer focus:outline-none"
              title="Select Screen Design Template"
            >
              <optgroup label="Preset Screen Templates">
                {PRESET_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id} className="bg-popover text-popover-foreground">
                    {tpl.name}
                  </option>
                ))}
              </optgroup>
              {customTemplates.length > 0 && (
                <optgroup label="Your Saved Templates">
                  {customTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id} className="bg-popover text-popover-foreground">
                      {tpl.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Franchise Bidding Stations Column Dropdown */}
          <div className="flex items-center gap-1.5 bg-muted/60 border border-border px-3 py-1.5 rounded-xl shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider hidden sm:inline">Franchise Cols:</span>
            <select
              value={design.zones?.team_columns || 4}
              onChange={(e) => {
                const cols = Number(e.target.value)
                setDesign((prev) => ({
                  ...prev,
                  zones: { ...prev.zones, team_columns: cols },
                }))
              }}
              className="bg-transparent text-foreground font-black text-xs cursor-pointer focus:outline-none"
              title="Configure Franchise Bidding Stations Grid Columns"
            >
              <option value={2} className="bg-popover text-popover-foreground">2 Columns</option>
              <option value={3} className="bg-popover text-popover-foreground">3 Columns</option>
              <option value={4} className="bg-popover text-popover-foreground">4 Columns (Standard)</option>
              <option value={5} className="bg-popover text-popover-foreground">5 Columns</option>
              <option value={6} className="bg-popover text-popover-foreground">6 Columns</option>
              <option value={7} className="bg-popover text-popover-foreground">7 Columns</option>
              <option value={8} className="bg-popover text-popover-foreground">8 Columns</option>
              <option value={10} className="bg-popover text-popover-foreground">10 Columns</option>
              <option value={12} className="bg-popover text-popover-foreground">12 Columns</option>
              <option value={14} className="bg-popover text-popover-foreground">14 Columns</option>
            </select>
          </div>

          {/* Templates Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTemplateModalOpen(true)}
            className="rounded-xl text-xs font-bold border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 shadow-2xs"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1 text-amber-500" /> Screen Templates
            <span className="ml-1 text-[10px] bg-amber-500 text-zinc-950 px-1.5 py-0.2 rounded-full font-black">
              {PRESET_TEMPLATES.length + customTemplates.length}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefault}
            disabled={saving}
            className="rounded-xl text-xs font-bold border-border text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-400" /> Reset Default
          </Button>

          <Button
            size="sm"
            onClick={handleSaveDesign}
            disabled={saving}
            className="rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 mr-1 text-emerald-950" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1 text-slate-950" /> Save Page Design
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Studio: Left Config Panels + Right Live Canvas Stage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ================= LEFT CONFIGURATION PANEL (4 COLS) ================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Section Dropdown Selector (Matching PdfDesignStudio pattern) */}
          <div className="bg-card border border-border p-3.5 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Designer Section Selector
              </label>
              <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20">
                Live Studio
              </span>
            </div>
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as any)}
              className="w-full text-xs font-black bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="screen_elements">📺 01 What appears on screen ({selectedCount} selected)</option>
              <option value="canvas">📐 02 Canvas (Mode & Snap Grid)</option>
              <option value="zones">🏛️ 03 Fixed Auction Zones (Columns & Widths)</option>
              <option value="hammer">🔨 04 Hammer Action Controls (Buttons & Order)</option>
              <option value="branding">🏆 05 Broadcast Branding (Logos & Title)</option>
              <option value="background">🎨 06 Background (Stadium & Themes)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              Selected section is displayed below; all others remain hidden.
            </p>
          </div>

          {/* 01: What Appears on Screen */}
          {activeSection === 'screen_elements' && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase text-amber-500">01</span>
                  <h3 className="font-extrabold text-sm text-foreground">What appears on screen</h3>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  {selectedCount} selected
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tick only what you need. Each selected item can then be moved and resized in the preview.
              </p>

            {/* Add Custom Boxes (Photo, Video, Bid History, Text) Action Row */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> Add Configurable Boxes
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">Attach Photos, Videos & Stream</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/turf-element', 'photo')
                    e.dataTransfer.setData('text/plain', 'photo')
                  }}
                  onClick={() => handleAddCustomBox('photo')}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-bold text-foreground transition cursor-grab active:cursor-grabbing shadow-2xs hover:border-amber-400"
                  title="Drag onto canvas or click to add photo box"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>+ Photo</span>
                </button>
                <button
                  type="button"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/turf-element', 'video')
                    e.dataTransfer.setData('text/plain', 'video')
                  }}
                  onClick={() => handleAddCustomBox('video')}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-bold text-foreground transition cursor-grab active:cursor-grabbing shadow-2xs hover:border-sky-400"
                  title="Drag onto canvas or click to add video box"
                >
                  <Video className="w-3.5 h-3.5 text-sky-400" />
                  <span>+ Video</span>
                </button>
                <button
                  type="button"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/turf-element', 'bid_history')
                    e.dataTransfer.setData('text/plain', 'bid_history')
                  }}
                  onClick={() => handleAddCustomBox('bid_history')}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-bold text-foreground transition cursor-grab active:cursor-grabbing shadow-2xs hover:border-purple-400"
                  title="Drag onto canvas or click to configure bid history panel"
                >
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>+ Bid History</span>
                </button>
                <button
                  type="button"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/turf-element', 'action_bar')
                    e.dataTransfer.setData('text/plain', 'action_bar')
                  }}
                  onClick={() => handleAddCustomBox('action_bar')}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-card hover:bg-muted border border-emerald-500/50 text-[11px] font-bold text-emerald-400 transition cursor-grab active:cursor-grabbing shadow-2xs hover:border-emerald-400 hover:bg-emerald-500/10"
                  title="Drag onto canvas or click to place Live Action Controls"
                >
                  <Gavel className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Action Bar</span>
                </button>
                <button
                  type="button"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/turf-element', 'text')
                    e.dataTransfer.setData('text/plain', 'text')
                  }}
                  onClick={() => handleAddCustomBox('text')}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-bold text-foreground transition cursor-grab active:cursor-grabbing shadow-2xs hover:border-blue-400"
                  title="Drag onto canvas or click to add announcement text"
                >
                  <Type className="w-3.5 h-3.5 text-blue-400" />
                  <span>+ Text</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {/* 1. Standard Arena Elements */}
              {Object.entries(ELEMENT_LABELS).map(([key, meta]) => {
                const el = design.elements[key]
                const isChecked = el ? el.selected : false
                const hasLabel = el ? el.show_label : meta.fieldNameDefault
                const isSelected = selectedKey === key

                return (
                  <div key={key} className="space-y-1.5">
                    <div
                      onClick={() => setSelectedKey(key)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/50 text-foreground font-bold'
                          : isChecked
                          ? 'border-amber-500/40 bg-amber-500/5 text-foreground hover:bg-amber-500/10'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleElementSelected(key)
                          }}
                          className="rounded border-border text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            {key === 'bid_history' && <History className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                            {key === 'action_bar' && <Gavel className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {key === 'player_photo' && <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <p className="text-xs font-bold leading-none truncate">{meta.label}</p>
                            {key === 'bid_history' && (
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                                STREAM
                              </span>
                            )}
                            {key === 'action_bar' && (
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                ACTION BAR
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {key === 'bid_history' ? (
                              'Live auction stream • Click to configure'
                            ) : key === 'action_bar' ? (
                              'Action & Hammer Controls • Click to configure & drag'
                            ) : (
                              <>
                                Visible on screen • Field name:{' '}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleElementLabel(key)
                                  }}
                                  className="font-bold underline text-amber-600 hover:text-amber-500 ml-0.5 cursor-pointer"
                                >
                                  {hasLabel ? 'Yes' : 'No'}
                                </button>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && (
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                            Editing
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleElementSelected(key)
                          }}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition ${
                            isChecked
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 font-extrabold'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {isChecked ? 'On' : 'Off'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Config Drawer for Bid History */}
                    {key === 'bid_history' && isSelected && (
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-purple-500/40 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
                          <span className="font-bold text-purple-300 flex items-center gap-1.5 text-[11px]">
                            <Sliders className="w-3 h-3" /> Bid History Stream Controls
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateElementProp('bid_history', 'x', 74)
                              updateElementProp('bid_history', 'y', 9.5)
                              updateElementProp('bid_history', 'w', 24)
                              updateElementProp('bid_history', 'h', 77)
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition cursor-pointer"
                          >
                            Reset Right Panel
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Header Title</label>
                          <input
                            type="text"
                            value={el?.title || el?.label || 'BID HISTORY'}
                            onChange={(e) => {
                              updateElementProp('bid_history', 'title', e.target.value)
                              updateElementProp('bid_history', 'label', e.target.value)
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                            placeholder="e.g. BID HISTORY"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Max Visible Bids</label>
                            <div className="grid grid-cols-4 gap-1">
                              {[5, 8, 12, 20].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => updateElementProp('bid_history', 'max_bids', num)}
                                  className={`py-1 rounded text-[11px] font-bold border transition cursor-pointer text-center ${
                                    (el?.max_bids || 8) === num
                                      ? 'bg-purple-500 text-white border-purple-400'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Panel Theme</label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: 'cyber', label: 'Cyber' },
                                { id: 'glass', label: 'Glass' },
                                { id: 'solid', label: 'Solid' },
                              ].map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => updateElementProp('bid_history', 'panel_theme', t.id)}
                                  className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                                    (el?.panel_theme || 'cyber') === t.id
                                      ? 'bg-purple-500 text-white border-purple-400'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400">
                          💡 You can also drag & resize the Bid History panel directly on the canvas preview to make it bigger, wider, or reposition it anywhere.
                        </p>
                      </div>
                    )}

                    {/* Inline Config Drawer for Player Photo */}
                    {key === 'player_photo' && isSelected && (
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-2 text-xs">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px]">
                          <ImageIcon className="w-3 h-3" /> Player Photo Attachment Options
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => triggerBoxMediaUpload('player_photo', 'image')}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer transition shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Custom Photo</span>
                          </button>
                          <input
                            type="text"
                            placeholder="Or paste photo URL..."
                            value={el?.media_url || ''}
                            onChange={(e) => updateElementProp('player_photo', 'media_url', e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Inline Config Drawer for Action Bar */}
                    {key === 'action_bar' && isSelected && (
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/40 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                          <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                            <Gavel className="w-3.5 h-3.5" /> Action Controls on Canvas Stage
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {currentActionButtons.filter((b) => b.visible).length} Buttons Active
                          </span>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Canvas Snap Position</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                updateElementProp('action_bar', 'x', 2)
                                updateElementProp('action_bar', 'y', 88)
                                updateElementProp('action_bar', 'w', 96)
                                updateElementProp('action_bar', 'h', 10)
                              }}
                              className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[10px] text-center cursor-pointer transition"
                            >
                              Snap Bottom (Default)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateElementProp('action_bar', 'x', 2)
                                updateElementProp('action_bar', 'y', 1.5)
                                updateElementProp('action_bar', 'w', 96)
                                updateElementProp('action_bar', 'h', 10)
                              }}
                              className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[10px] text-center cursor-pointer transition"
                            >
                              Snap Top
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateElementProp('action_bar', 'x', 18)
                                updateElementProp('action_bar', 'y', 86)
                                updateElementProp('action_bar', 'w', 64)
                                updateElementProp('action_bar', 'h', 11)
                              }}
                              className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[10px] text-center cursor-pointer transition"
                            >
                              Floating Center
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          💡 <strong>Drag & Drop:</strong> You can drag the Action Controls bar anywhere on the canvas stage to place it, and drag any edge handle to resize it.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 2. Custom User-Added Boxes (Photos, Videos, Text) */}
              {Object.entries(design.elements)
                .filter(([k]) => !ELEMENT_LABELS[k])
                .map(([key, el]) => {
                  const isChecked = el ? el.selected : false
                  const boxType = el.type || (key.includes('photo') ? 'photo' : key.includes('video') ? 'video' : 'text')
                  const isSelected = selectedKey === key

                  return (
                    <div key={key} className="space-y-1.5">
                      <div
                        onClick={() => setSelectedKey(key)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/50 text-foreground font-bold'
                            : isChecked
                            ? 'border-amber-500/40 bg-amber-500/5 text-foreground hover:bg-amber-500/10'
                            : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleElementSelected(key)
                            }}
                            className="rounded border-border text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer shrink-0"
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              {boxType === 'photo' ? (
                                <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : boxType === 'video' ? (
                                <Video className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              ) : (
                                <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <p className="text-xs font-bold leading-none truncate">
                                {el.label || (boxType === 'photo' ? 'Photo Box' : boxType === 'video' ? 'Video Box' : 'Text Box')}
                              </p>
                              <span
                                className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded border shrink-0 ${
                                  boxType === 'photo'
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    : boxType === 'video'
                                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {boxType}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {el.media_url || el.video_url ? (
                                <span className="text-emerald-400 font-semibold">✓ Media attached</span>
                              ) : (
                                'No media attached • Click to configure'
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && (
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                              Editing
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCustomBox(key)
                            }}
                            className="p-1 rounded-md text-red-400 hover:bg-red-500/15 transition cursor-pointer"
                            title="Delete Box"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleElementSelected(key)
                            }}
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition ${
                              isChecked
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 font-extrabold'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {isChecked ? 'On' : 'Off'}
                          </button>
                        </div>
                      </div>

                      {/* Inline Configuration Drawer for Custom Boxes */}
                      {isSelected && (
                        <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-2.5 text-xs">
                          {/* Box Title Rename */}
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Box Label Name</label>
                            <input
                              type="text"
                              value={el.label || ''}
                              onChange={(e) => updateElementProp(key, 'label', e.target.value)}
                              placeholder={boxType === 'photo' ? 'e.g. Sponsor Banner' : boxType === 'video' ? 'e.g. Promo Clip' : 'e.g. Announcement'}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                            />
                          </div>

                          {/* PHOTO BOX CONFIGURATION */}
                          {boxType === 'photo' && (
                            <div className="space-y-2.5">
                              {el.media_url && (
                                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-700 bg-black/40 flex items-center justify-center">
                                  <img
                                    src={el.media_url}
                                    alt="Preview"
                                    className="w-full h-full"
                                    style={{ objectFit: el.object_fit || 'cover' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateElementProp(key, 'media_url', '')}
                                    className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-500 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                    title="Remove Photo"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => triggerBoxMediaUpload(key, 'image')}
                                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer transition shadow-2xs"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload Photo File...</span>
                                </button>
                                <input
                                  type="text"
                                  placeholder="Or paste image URL..."
                                  value={el.media_url || ''}
                                  onChange={(e) => updateElementProp(key, 'media_url', e.target.value)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Image Fit</label>
                                  <div className="flex items-center gap-1">
                                    {(['cover', 'contain', 'fill'] as const).map((fit) => (
                                      <button
                                        key={fit}
                                        type="button"
                                        onClick={() => updateElementProp(key, 'object_fit', fit)}
                                        className={`flex-1 py-1 rounded text-[10px] font-bold capitalize border transition cursor-pointer ${
                                          (el.object_fit || 'cover') === fit
                                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                        }`}
                                      >
                                        {fit}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Corner Rounding</label>
                                  <div className="flex items-center gap-1">
                                    {[0, 8, 14, 24].map((rad) => (
                                      <button
                                        key={rad}
                                        type="button"
                                        onClick={() => updateElementProp(key, 'border_radius', rad)}
                                        className={`flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                          (el.border_radius ?? 12) === rad
                                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                        }`}
                                      >
                                        {rad}px
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* VIDEO BOX CONFIGURATION */}
                          {boxType === 'video' && (
                            <div className="space-y-2.5">
                              {(el.video_url || el.media_url) && (
                                <div className="relative w-full h-28 rounded-lg overflow-hidden border border-sky-500/30 bg-black flex items-center justify-center">
                                  <video
                                    src={el.video_url || el.media_url}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full"
                                    style={{ objectFit: el.object_fit || 'cover' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateElementProp(key, 'video_url', '')
                                      updateElementProp(key, 'media_url', '')
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-500 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                    title="Remove Video"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => triggerBoxMediaUpload(key, 'video')}
                                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer transition shadow-2xs"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload Video (MP4)...</span>
                                </button>
                                <input
                                  type="text"
                                  placeholder="Or paste video URL (MP4)..."
                                  value={el.video_url || el.media_url || ''}
                                  onChange={(e) => {
                                    updateElementProp(key, 'video_url', e.target.value)
                                    updateElementProp(key, 'media_url', e.target.value)
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Video Fit</label>
                                  <div className="flex items-center gap-1">
                                    {(['cover', 'contain'] as const).map((fit) => (
                                      <button
                                        key={fit}
                                        type="button"
                                        onClick={() => updateElementProp(key, 'object_fit', fit)}
                                        className={`flex-1 py-1 rounded text-[10px] font-bold capitalize border transition cursor-pointer ${
                                          (el.object_fit || 'cover') === fit
                                            ? 'bg-sky-500 text-zinc-950 border-sky-400'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                        }`}
                                      >
                                        {fit}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Corner Rounding</label>
                                  <div className="flex items-center gap-1">
                                    {[0, 8, 14, 24].map((rad) => (
                                      <button
                                        key={rad}
                                        type="button"
                                        onClick={() => updateElementProp(key, 'border_radius', rad)}
                                        className={`flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                          (el.border_radius ?? 12) === rad
                                            ? 'bg-sky-500 text-zinc-950 border-sky-400'
                                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                        }`}
                                      >
                                        {rad}px
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* TEXT BOX CONFIGURATION */}
                          {boxType === 'text' && (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">Text Content</label>
                                <input
                                  type="text"
                                  value={el.custom_text || ''}
                                  onChange={(e) => updateElementProp(key, 'custom_text', e.target.value)}
                                  placeholder="e.g. POWER PLAY LOT - 2026"
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                                />
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">
                              Resize & drag box on stage preview
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomBox(key)}
                              className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Remove Box
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
          )}

          {/* 02: Canvas */}
          {activeSection === 'canvas' && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="border-b border-border pb-2.5">
              <span className="text-[11px] font-mono font-bold uppercase text-amber-500">02</span>
              <h3 className="font-extrabold text-sm text-foreground">Canvas</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDesign((prev) => ({ ...prev, canvas_mode: 'professional' }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  design.canvas_mode === 'professional'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-extrabold'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Professional
              </button>
              <button
                type="button"
                onClick={() => setDesign((prev) => ({ ...prev, canvas_mode: 'compact' }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  design.canvas_mode === 'compact'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-extrabold'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Compact
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-foreground">Snap grid</label>
                <p className="text-[10px] text-muted-foreground">Align elements automatically</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={design.snap_grid}
                  onChange={(e) => setDesign((prev) => ({ ...prev, snap_grid: Number(e.target.value) }))}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground"
                >
                  <option value={1}>None (1%)</option>
                  <option value={2}>2%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                </select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDesign((prev) => ({ ...prev, grid_visible: !prev.grid_visible }))}
                  className={`rounded-xl text-xs font-bold ${
                    design.grid_visible
                      ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5 mr-1" />
                  {design.grid_visible ? 'Grid On' : 'Grid Off'}
                </Button>
              </div>
            </div>
          </div>
          )}

          {/* 03: Fixed Auction Zones */}
          {activeSection === 'zones' && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="border-b border-border pb-2.5">
              <span className="text-[11px] font-mono font-bold uppercase text-amber-500">03</span>
              <h3 className="font-extrabold text-sm text-foreground">Fixed Auction Zones</h3>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              The player canvas remains the visual focus. Team buttons, action controls and bid history use fixed zones so they never collide.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-foreground block">Franchise columns</label>
                  <span className="text-[10px] text-muted-foreground">Grid layout for bidding stations</span>
                </div>
                <select
                  value={design.zones?.team_columns || 4}
                  onChange={(e) =>
                    setDesign((prev) => ({
                      ...prev,
                      zones: { ...prev.zones, team_columns: Number(e.target.value) },
                    }))
                  }
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-black text-amber-500 cursor-pointer h-8 shadow-xs"
                >
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns (Standard)</option>
                  <option value={5}>5 Columns</option>
                  <option value={6}>6 Columns</option>
                  <option value={7}>7 Columns</option>
                  <option value={8}>8 Columns</option>
                  <option value={10}>10 Columns</option>
                  <option value={12}>12 Columns</option>
                  <option value={14}>14 Columns</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Action zone width (px)</label>
                <Input
                  type="number"
                  value={design.zones?.action_zone_width || 455}
                  onChange={(e) =>
                    setDesign((prev) => ({
                      ...prev,
                      zones: { ...prev.zones, action_zone_width: Number(e.target.value) },
                    }))
                  }
                  className="w-20 text-xs font-mono font-bold text-center h-8"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Bid history width (px)</label>
                <Input
                  type="number"
                  value={design.zones?.bid_history_width || 300}
                  onChange={(e) =>
                    setDesign((prev) => ({
                      ...prev,
                      zones: { ...prev.zones, bid_history_width: Number(e.target.value) },
                    }))
                  }
                  className="w-20 text-xs font-mono font-bold text-center h-8"
                />
              </div>
            </div>
          </div>
          )}

          {/* 04: Hammer Action Controls */}
          {activeSection === 'hammer' && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase text-amber-500">04</span>
                <h3 className="font-extrabold text-sm text-foreground">Hammer Action Controls</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/turf-element', 'action_bar')
                    e.dataTransfer.setData('text/plain', 'action_bar')
                  }}
                  onClick={() => handleAddCustomBox('action_bar')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-grab active:cursor-grabbing"
                  title="Drag onto Canvas or click to place"
                >
                  <Move className="w-3 h-3" />
                  <span>🎯 Drag to Canvas Stage</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetActionButtons}
                  className="text-[10px] font-bold text-amber-600 hover:text-amber-500 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Rearrange button order (↑ / ↓), toggle visibility, and rename labels for the live auction console.
            </p>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {currentActionButtons.map((btn, idx) => {
                const getBtnIcon = () => {
                  switch (btn.id) {
                    case 'sold':
                      return <Gavel className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    case 'unsold':
                      return <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    case 'custom_bid':
                      return <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    case 'undo_sale':
                      return <RotateCcw className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    case 'undo_bid':
                      return <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    case 'reset_bid':
                      return <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    default:
                      return null
                  }
                }

                return (
                  <div
                    key={btn.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      btn.visible
                        ? 'border-border bg-card shadow-2xs'
                        : 'border-border/60 bg-muted/30 opacity-60'
                    }`}
                  >
                    {/* Reorder Buttons Up/Down */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveActionButton(idx, 'up')}
                        className="p-1 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed text-foreground cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentActionButtons.length - 1}
                        onClick={() => handleMoveActionButton(idx, 'down')}
                        className="p-1 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed text-foreground cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Visibility Checkbox */}
                    <input
                      type="checkbox"
                      checked={btn.visible}
                      onChange={() => handleToggleActionButtonVisibility(btn.id)}
                      className="rounded border-border text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer shrink-0"
                      title={btn.visible ? 'Visible' : 'Hidden'}
                    />

                    {/* Icon */}
                    {getBtnIcon()}

                    {/* Editable Label */}
                    <div className="flex-1 min-w-0">
                      <Input
                        type="text"
                        value={btn.label}
                        onChange={(e) => handleUpdateActionButtonLabel(btn.id, e.target.value)}
                        placeholder="Button label..."
                        className="h-8 text-xs font-bold bg-background"
                      />
                    </div>

                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-4 text-right">
                      #{idx + 1}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          )}

          {/* 05: Broadcast Branding */}
          {activeSection === 'branding' && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="border-b border-border pb-2.5">
              <span className="text-[11px] font-mono font-bold uppercase text-amber-500">05</span>
              <h3 className="font-extrabold text-sm text-foreground">Broadcast Branding</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-foreground">Logo count</label>
                <Input
                  type="number"
                  value={branding.logo_count}
                  onChange={(e) =>
                    setDesign((prev) => ({
                      ...prev,
                      zones: {
                        ...prev.zones,
                        branding: { ...prev.zones.branding!, logo_count: Number(e.target.value) },
                      },
                    }))
                  }
                  className="h-8 text-xs font-mono text-center mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-foreground">Logo size</label>
                <Input
                  type="number"
                  value={branding.logo_size}
                  onChange={(e) =>
                    setDesign((prev) => ({
                      ...prev,
                      zones: {
                        ...prev.zones,
                        branding: { ...prev.zones.branding!, logo_size: Number(e.target.value) },
                      },
                    }))
                  }
                  className="h-8 text-xs font-mono text-center mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-foreground">Logo placement</label>
                <select
                  value={branding.logo_position}
                  onChange={(e) =>
                    setDesign((prev) => ({
                      ...prev,
                      zones: {
                        ...prev.zones,
                        branding: { ...prev.zones.branding!, logo_position: e.target.value as any },
                      },
                    }))
                  }
                  className="h-8 text-xs font-bold rounded-xl border border-border bg-background px-2 w-full mt-1"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Tournament title text</label>
              <Input
                type="text"
                value={branding.title_text}
                onChange={(e) => {
                  const val = e.target.value
                  setDesign((prev) => ({
                    ...prev,
                    zones: {
                      ...prev.zones,
                      branding: { ...prev.zones.branding!, title_text: val },
                    },
                    elements: {
                      ...prev.elements,
                      tournament_title: {
                        ...(prev.elements.tournament_title || { x: 20, y: 2, w: 60, h: 7, font_size: 26, selected: true }),
                      },
                    },
                  }))
                }}
                placeholder="e.g. Test Tournament"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-foreground">Tournament name size</label>
                <Input
                  type="number"
                  value={design.elements.tournament_title?.font_size || branding.title_size || 26}
                  onChange={(e) => {
                    const sz = Number(e.target.value)
                    setDesign((prev) => ({
                      ...prev,
                      zones: {
                        ...prev.zones,
                        branding: { ...prev.zones.branding!, title_size: sz },
                      },
                      elements: {
                        ...prev.elements,
                        tournament_title: {
                          ...(prev.elements.tournament_title || { x: 20, y: 2, w: 60, h: 7, selected: true }),
                          font_size: sz,
                        },
                      },
                    }))
                  }}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground">Title colour</label>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="color"
                    value={design.elements.tournament_title?.colour || branding.title_colour || '#FFD54A'}
                    onChange={(e) => {
                      const clr = e.target.value
                      setDesign((prev) => ({
                        ...prev,
                        zones: {
                          ...prev.zones,
                          branding: { ...prev.zones.branding!, title_colour: clr },
                        },
                        elements: {
                          ...prev.elements,
                          tournament_title: {
                            ...(prev.elements.tournament_title || { x: 20, y: 2, w: 60, h: 7, selected: true }),
                            colour: clr,
                          },
                        },
                      }))
                    }}
                    className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                  />
                  <Input
                    type="text"
                    value={design.elements.tournament_title?.colour || branding.title_colour}
                    onChange={(e) => {
                      const clr = e.target.value
                      setDesign((prev) => ({
                        ...prev,
                        zones: {
                          ...prev.zones,
                          branding: { ...prev.zones.branding!, title_colour: clr },
                        },
                        elements: {
                          ...prev.elements,
                          tournament_title: {
                            ...(prev.elements.tournament_title || { x: 20, y: 2, w: 60, h: 7, selected: true }),
                            colour: clr,
                          },
                        },
                      }))
                    }}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Tournament Title Image Upload */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-foreground">Upload tournament name image</label>
              <div className="flex items-center gap-2">
                <input
                  ref={titleFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadTournamentImage}
                  disabled={uploadingTitleImage}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border file:border-border file:text-xs file:font-bold file:bg-muted hover:file:bg-muted/80 cursor-pointer"
                />
                {uploadingTitleImage && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={branding.remove_title_bg}
                  onChange={(e) =>
                    setDesign((prev) => ({
                      ...prev,
                      zones: {
                        ...prev.zones,
                        branding: { ...prev.zones.branding!, remove_title_bg: e.target.checked },
                      },
                    }))
                  }
                  className="rounded border-border text-amber-500 focus:ring-amber-500"
                />
                <span>Remove uploaded title image background</span>
              </label>
            </div>
          </div>
          )}

          {/* 06: Background */}
          {activeSection === 'background' && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="border-b border-border pb-2.5">
              <span className="text-[11px] font-mono font-bold uppercase text-amber-500">06</span>
              <h3 className="font-extrabold text-sm text-foreground">Background</h3>
            </div>

            <div className="space-y-2">
              <select
                value={design.background_mode}
                onChange={(e) => setDesign((prev) => ({ ...prev, background_mode: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground"
              >
                <option value="stadium">Stadium Arena</option>
                <option value="dark_neon">Dark Neon Blue</option>
                <option value="classic_turf">Turf Cricket Field</option>
                <option value="custom">Custom Uploaded</option>
              </select>

              <div className="pt-1">
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBackgroundImage}
                  disabled={uploadingBgImage}
                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border file:border-border file:text-xs file:font-bold file:bg-muted hover:file:bg-muted/80 cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Upload here to replace the live auction background.
                </p>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* ================= RIGHT LIVE PREVIEW & DRAG-AND-DROP CANVAS (8 COLS) ================= */}
        <div className="lg:col-span-8 space-y-3">
          {/* Canvas Sub-Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card border border-border p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Stage Preview
                </span>
                <h4 className="font-black text-sm text-foreground">
                  {samplePlayerData.player_name}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    • 16:9 Broadcast Canvas
                  </span>
                </h4>
              </div>

              {/* View Switcher: Full Screen Arena vs Standard View */}
              <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setPreviewArenaMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    previewArenaMode
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen Arena Frame</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewArenaMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !previewArenaMode
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>Isolated Canvas</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={!selectedKey}
                className="rounded-xl text-xs font-bold border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Hide Selected
              </Button>
            </div>
          </div>

          {/* Feedback banner if template applied/saved */}
          {templateFeedback && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-500 text-xs font-bold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {templateFeedback}
              </span>
              <button
                type="button"
                onClick={() => setTemplateFeedback(null)}
                className="text-amber-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Active Element Quick-Editor Toolbar when an element is tapped/selected */}
          {selectedKey && design.elements[selectedKey] && (
            <div className="rounded-2xl border-2 border-amber-500/60 bg-slate-900/95 p-3.5 shadow-2xl text-white space-y-3 ring-2 ring-amber-500/20 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                    <Sliders className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      Editing: {ELEMENT_LABELS[selectedKey]?.label || selectedKey}
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        ({Math.round(design.elements[selectedKey].x)}%, {Math.round(design.elements[selectedKey].y)}%)
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Drag on canvas to position or resize • Use controls below to customize width, height, font, colour & labels
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedKey(null)}
                    className="h-7 text-xs font-bold border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg px-2.5"
                  >
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Done
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleElementSelected(selectedKey)}
                    className={`h-7 text-xs font-bold rounded-lg px-2.5 transition cursor-pointer ${
                      design.elements[selectedKey]?.selected
                        ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                        : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                    }`}
                  >
                    {design.elements[selectedKey]?.selected ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Show on Screen
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Inspector Control Pods */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
                {/* Pod 1: Dimensions & Position */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-sm ring-1 ring-white/5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5" />
                      Dimensions & Position
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      X: {Math.round(design.elements[selectedKey].x)}% • Y: {Math.round(design.elements[selectedKey].y)}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                    {/* Width (W: %) */}
                    <div className="flex-1 min-w-[105px]">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Width (W: %)
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateElementProp(
                              selectedKey,
                              'w',
                              Math.max(5, (design.elements[selectedKey].w || 20) - 2)
                            )
                          }
                          className="w-7 h-7 rounded-l bg-slate-800 hover:bg-slate-700 border border-r-0 border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm active:bg-slate-600 transition cursor-pointer"
                          title="Make narrower (-2%)"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={Math.round(design.elements[selectedKey].w || 20)}
                          onChange={(e) => updateElementProp(selectedKey, 'w', Math.max(5, Math.min(100, Number(e.target.value))))}
                          className="w-12 h-7 text-center bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateElementProp(
                              selectedKey,
                              'w',
                              Math.min(100, (design.elements[selectedKey].w || 20) + 2)
                            )
                          }
                          className="w-7 h-7 rounded-r bg-slate-800 hover:bg-slate-700 border border-l-0 border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm active:bg-slate-600 transition cursor-pointer"
                          title="Make wider (+2%)"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Height (H: %) */}
                    <div className="flex-1 min-w-[105px]">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Height (H: %)
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateElementProp(
                              selectedKey,
                              'h',
                              Math.max(3, (design.elements[selectedKey].h || 10) - 2)
                            )
                          }
                          className="w-7 h-7 rounded-l bg-slate-800 hover:bg-slate-700 border border-r-0 border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm active:bg-slate-600 transition cursor-pointer"
                          title="Make shorter (-2%)"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={3}
                          max={100}
                          value={Math.round(design.elements[selectedKey].h || 10)}
                          onChange={(e) => updateElementProp(selectedKey, 'h', Math.max(3, Math.min(100, Number(e.target.value))))}
                          className="w-12 h-7 text-center bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateElementProp(
                              selectedKey,
                              'h',
                              Math.min(100, (design.elements[selectedKey].h || 10) + 2)
                            )
                          }
                          className="w-7 h-7 rounded-r bg-slate-800 hover:bg-slate-700 border border-l-0 border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm active:bg-slate-600 transition cursor-pointer"
                          title="Make taller (+2%)"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Nudge D-Pad */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Nudge Position
                      </label>
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => nudgeElement(selectedKey, -2, 0)}
                          className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-200 flex items-center justify-center active:bg-amber-500 active:text-slate-950 transition cursor-pointer"
                          title="Nudge Left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => nudgeElement(selectedKey, 2, 0)}
                          className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-200 flex items-center justify-center active:bg-amber-500 active:text-slate-950 transition cursor-pointer"
                          title="Nudge Right"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => nudgeElement(selectedKey, 0, -2)}
                          className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-200 flex items-center justify-center active:bg-amber-500 active:text-slate-950 transition cursor-pointer"
                          title="Nudge Up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => nudgeElement(selectedKey, 0, 2)}
                          className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-200 flex items-center justify-center active:bg-amber-500 active:text-slate-950 transition cursor-pointer"
                          title="Nudge Down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pod 2: Typography & Appearance */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-sm ring-1 ring-white/5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" />
                      Typography & Style
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Font & Controls
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                    {/* Font Family Picker */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Font Family
                      </label>
                      <select
                        value={design.elements[selectedKey].font_family || 'Inter'}
                        onChange={(e) => updateElementProp(selectedKey, 'font_family', e.target.value)}
                        className="h-7 px-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs cursor-pointer focus:outline-none focus:border-amber-400"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Oswald">Oswald</option>
                        <option value="Impact">Impact</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="system-ui">System</option>
                      </select>
                    </div>

                    {/* Font Size (px) */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Size (px)
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateElementProp(
                              selectedKey,
                              'font_size',
                              Math.max(8, (design.elements[selectedKey].font_size || 20) - 2)
                            )
                          }
                          className="w-7 h-7 rounded-l bg-slate-800 hover:bg-slate-700 border border-r-0 border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm active:bg-slate-600 transition cursor-pointer"
                          title="Decrease font size"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={8}
                          max={96}
                          value={design.elements[selectedKey].font_size || 20}
                          onChange={(e) => updateElementProp(selectedKey, 'font_size', Number(e.target.value))}
                          className="w-11 h-7 text-center bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateElementProp(
                              selectedKey,
                              'font_size',
                              Math.min(96, (design.elements[selectedKey].font_size || 20) + 2)
                            )
                          }
                          className="w-7 h-7 rounded-r bg-slate-800 hover:bg-slate-700 border border-l-0 border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm active:bg-slate-600 transition cursor-pointer"
                          title="Increase font size"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Bold, Italic, Underline Toggles */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Style
                      </label>
                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 gap-0.5 h-7">
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedKey, 'bold', !(design.elements[selectedKey].bold !== false))}
                          className={`px-2 h-6 rounded text-xs font-black transition cursor-pointer ${
                            design.elements[selectedKey].bold !== false ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedKey, 'italic', !design.elements[selectedKey].italic)}
                          className={`px-2 h-6 rounded text-xs font-bold italic transition cursor-pointer ${
                            design.elements[selectedKey].italic ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedKey, 'underline', !design.elements[selectedKey].underline)}
                          className={`px-2 h-6 rounded text-xs font-bold underline transition cursor-pointer ${
                            design.elements[selectedKey].underline ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Underline"
                        >
                          U
                        </button>
                      </div>
                    </div>

                    {/* Fit to Size Toggle */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Fit to Size
                      </label>
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedKey, 'fit_to_size', !design.elements[selectedKey].fit_to_size)}
                        className={`h-7 px-2 rounded-lg border text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                          design.elements[selectedKey].fit_to_size
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title="Auto-shrink font size to prevent overlapping or hiding text"
                      >
                        Fit {design.elements[selectedKey].fit_to_size ? '✓' : ''}
                      </button>
                    </div>

                    {/* Text Colour */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Colour
                      </label>
                      <div className="flex items-center gap-1.5 h-7">
                        <input
                          type="color"
                          value={design.elements[selectedKey].colour || '#FFFFFF'}
                          onChange={(e) => updateElementProp(selectedKey, 'colour', e.target.value)}
                          className="w-7 h-7 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0 shrink-0"
                          title="Custom Colour Picker"
                        />
                        <div className="flex items-center gap-1">
                          {['#FFFFFF', '#FFD54A', '#10B981', '#38BDF8', '#EF4444'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateElementProp(selectedKey, 'colour', c)}
                              style={{ backgroundColor: c }}
                              className={`w-3.5 h-3.5 rounded-full border border-slate-900 shadow-xs hover:scale-125 transition cursor-pointer ${
                                (design.elements[selectedKey].colour || '#FFFFFF').toUpperCase() === c.toUpperCase()
                                  ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900'
                                  : ''
                              }`}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Alignment */}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Align
                      </label>
                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 gap-0.5 h-7">
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedKey, 'align', 'left')}
                          className={`p-1 rounded transition cursor-pointer ${
                            design.elements[selectedKey].align === 'left'
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Left Align"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedKey, 'align', 'center')}
                          className={`p-1 rounded transition cursor-pointer ${
                            design.elements[selectedKey].align === 'center'
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Center Align"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedKey, 'align', 'right')}
                          className={`p-1 rounded transition cursor-pointer ${
                            design.elements[selectedKey].align === 'right'
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Right Align"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pod 3: Labels & Content Override */}
                <div className="md:col-span-2 xl:col-span-1 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-sm ring-1 ring-white/5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      Labels & Content Override
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Text Customization
                    </span>
                  </div>

                  <div className="space-y-2 pt-0.5">
                    {/* Row 1: Show Label Toggle + Label Name */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-24 shrink-0">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                          Show Label
                        </label>
                        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 gap-0.5 h-7">
                          <button
                            type="button"
                            onClick={() => updateElementProp(selectedKey, 'show_label', true)}
                            className={`flex-1 h-6 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                              design.elements[selectedKey].show_label
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElementProp(selectedKey, 'show_label', false)}
                            className={`flex-1 h-6 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                              !design.elements[selectedKey].show_label
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 min-w-[130px]">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                          Label Name
                        </label>
                        <input
                          type="text"
                          value={design.elements[selectedKey].custom_label ?? (ELEMENT_LABELS[selectedKey]?.label || '')}
                          onChange={(e) => updateElementProp(selectedKey, 'custom_label', e.target.value)}
                          placeholder="Custom Label"
                          className="w-full h-7 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs shadow-inner focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
                        />
                      </div>
                    </div>

                    {/* Row 2: Custom Content Override */}
                    <div className="w-full">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 whitespace-nowrap">
                        Custom Content Override
                      </label>
                      <input
                        type="text"
                        value={design.elements[selectedKey].custom_text || ''}
                        onChange={(e) => updateElementProp(selectedKey, 'custom_text', e.target.value)}
                        placeholder="Override default display text..."
                        className="w-full h-7 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs shadow-inner focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden File Input for Custom Box Photo/Video Upload */}
              <input
                ref={customMediaInputRef}
                type="file"
                accept={customMediaTypeToUpload === 'video' ? 'video/*' : 'image/*'}
                onChange={handleCustomMediaFileSelected}
                className="hidden"
              />

              {/* Custom Box Content Configuration Sub-Panel */}
              {selectedKey && (design.elements[selectedKey]?.type || selectedKey.startsWith('custom_') || selectedKey === 'bid_history' || selectedKey === 'bidder_name' || selectedKey === 'franchise_stations') && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        {selectedKey === 'bid_history'
                          ? 'Bid History Stream Settings'
                          : selectedKey === 'bidder_name'
                          ? 'Bidder Team Name & Logo Settings'
                          : selectedKey === 'franchise_stations'
                          ? 'Franchise Bidding Stations (Option 4)'
                          : (design.elements[selectedKey]?.type === 'photo' || selectedKey.includes('photo'))
                          ? 'Photo Box Configuration'
                          : (design.elements[selectedKey]?.type === 'video' || selectedKey.includes('video'))
                          ? 'Video Stream Configuration'
                          : 'Custom Box Configuration'}
                      </span>
                      {selectedKey.startsWith('custom_') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomBox(selectedKey)}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 px-2 py-0.5 rounded border border-red-500/30 cursor-pointer transition"
                        >
                          <Trash2 className="w-3 h-3" /> Delete Box
                        </button>
                      )}
                    </div>

                    {/* If Bidder Team Name */}
                    {selectedKey === 'bidder_name' && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-xs text-slate-300 font-semibold">
                          Show Bidding Team Logo next to team name
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateElementProp(
                              'bidder_name',
                              'show_team_logo',
                              !(design.elements.bidder_name?.show_team_logo !== false)
                            )
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            design.elements.bidder_name?.show_team_logo !== false
                              ? 'bg-amber-500 text-zinc-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          {design.elements.bidder_name?.show_team_logo !== false ? 'Team Logo: ON' : 'Team Logo: OFF'}
                        </button>
                      </div>
                    )}

                    {/* If Franchise Bidding Stations (Option 4) */}
                    {selectedKey === 'franchise_stations' && (
                      <div className="space-y-2.5 pt-1 border-t border-slate-800 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              Grid Preset (Rows × Cols)
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { r: 2, c: 7, l: '2 × 7' },
                                { r: 1, c: 14, l: '1 × 14' },
                                { r: 14, c: 1, l: '14 × 1' },
                              ].map((g) => (
                                <button
                                  key={g.l}
                                  type="button"
                                  onClick={() => {
                                    updateElementProp('franchise_stations', 'grid_rows', g.r)
                                    updateElementProp('franchise_stations', 'grid_cols', g.c)
                                  }}
                                  className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    design.elements.franchise_stations?.grid_rows === g.r &&
                                    design.elements.franchise_stations?.grid_cols === g.c
                                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {g.l}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Box Color Style</label>
                            <div className="grid grid-cols-2 gap-1">
                              {[
                                { id: 'solid', l: 'Full Solid' },
                                { id: 'outline', l: 'Outline Only' },
                              ].map((st) => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => updateElementProp('franchise_stations', 'box_style', st.id)}
                                  className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    (design.elements.franchise_stations?.box_style || 'solid') === st.id
                                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {st.l}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">
                              Equidistant Box Spacing (Gap: px)
                            </label>
                            <div className="flex items-center gap-1">
                              {[2, 4, 6, 8, 12].map((gp) => (
                                <button
                                  key={gp}
                                  type="button"
                                  onClick={() => {
                                    updateElementProp('franchise_stations', 'gap_x', gp)
                                    updateElementProp('franchise_stations', 'gap_y', gp)
                                  }}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    (design.elements.franchise_stations?.gap_x || 6) === gp
                                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {gp}px
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">
                            Content Inside Box (Strictly contained within boundaries • Horizontal orientation)
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateElementProp(
                                  'franchise_stations',
                                  'show_number',
                                  !(design.elements.franchise_stations?.show_number !== false)
                                )
                              }
                              className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                design.elements.franchise_stations?.show_number !== false
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              Team Number: {design.elements.franchise_stations?.show_number !== false ? 'ON' : 'OFF'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateElementProp(
                                  'franchise_stations',
                                  'show_short_name',
                                  !(design.elements.franchise_stations?.show_short_name !== false)
                                )
                              }
                              className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                design.elements.franchise_stations?.show_short_name !== false
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              Short Name: {design.elements.franchise_stations?.show_short_name !== false ? 'ON' : 'OFF'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateElementProp(
                                  'franchise_stations',
                                  'show_balance',
                                  !design.elements.franchise_stations?.show_balance
                                )
                              }
                              className={`py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                design.elements.franchise_stations?.show_balance
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              Purse Balance: {design.elements.franchise_stations?.show_balance ? 'ON' : 'OFF'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* If Photo Box */}
                    {(design.elements[selectedKey]?.type === 'photo' || selectedKey.includes('photo')) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Attach Photo</label>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomMediaTypeToUpload('image')
                              customMediaInputRef.current?.click()
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition shadow-2xs hover:border-amber-400"
                          >
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            <span>Choose Image File...</span>
                          </button>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Or Paste Image URL</label>
                          <input
                            type="text"
                            placeholder="https://.../photo.png"
                            value={design.elements[selectedKey]?.media_url || ''}
                            onChange={(e) => updateElementProp(selectedKey, 'media_url', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Image Fit</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateElementProp(selectedKey, 'object_fit', 'cover')}
                              className={`flex-1 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                                (design.elements[selectedKey]?.object_fit || 'cover') === 'cover'
                                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              Cover
                            </button>
                            <button
                              type="button"
                              onClick={() => updateElementProp(selectedKey, 'object_fit', 'contain')}
                              className={`flex-1 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                                design.elements[selectedKey]?.object_fit === 'contain'
                                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              Contain
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* If Video Box */}
                    {(design.elements[selectedKey]?.type === 'video' || selectedKey.includes('video')) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Attach Video File</label>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomMediaTypeToUpload('video')
                              customMediaInputRef.current?.click()
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition shadow-2xs hover:border-sky-400"
                          >
                            <Upload className="w-3.5 h-3.5 text-sky-400" />
                            <span>Choose Video (MP4)...</span>
                          </button>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Or Paste Video URL</label>
                          <input
                            type="text"
                            placeholder="https://.../video.mp4"
                            value={design.elements[selectedKey]?.video_url || design.elements[selectedKey]?.media_url || ''}
                            onChange={(e) => {
                              updateElementProp(selectedKey, 'video_url', e.target.value)
                              updateElementProp(selectedKey, 'media_url', e.target.value)
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Video Fit</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateElementProp(selectedKey, 'object_fit', 'cover')}
                              className={`flex-1 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                                (design.elements[selectedKey]?.object_fit || 'cover') === 'cover'
                                  ? 'bg-sky-500 text-zinc-950 border-sky-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              Cover
                            </button>
                            <button
                              type="button"
                              onClick={() => updateElementProp(selectedKey, 'object_fit', 'contain')}
                              className={`flex-1 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                                design.elements[selectedKey]?.object_fit === 'contain'
                                  ? 'bg-sky-500 text-zinc-950 border-sky-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              Contain
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* If Custom Text Box */}
                    {(design.elements[selectedKey]?.type === 'text' || selectedKey.includes('text')) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-center">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Text Content</label>
                          <input
                            type="text"
                            value={design.elements[selectedKey]?.custom_text || ''}
                            onChange={(e) => updateElementProp(selectedKey, 'custom_text', e.target.value)}
                            placeholder="e.g. POWER PLAY LOT"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Box Label Name</label>
                          <input
                            type="text"
                            value={design.elements[selectedKey]?.label || ''}
                            onChange={(e) => updateElementProp(selectedKey, 'label', e.target.value)}
                            placeholder="Title in list"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* If Bid History Box */}
                    {selectedKey === 'bid_history' && (
                      <div className="space-y-2 text-xs text-slate-300">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-purple-400 font-bold">Live Stream Panel:</span>
                            <span>Position and stretch this box anywhere on the canvas to display live bids during the auction.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateElementProp('bid_history', 'x', 74)
                              updateElementProp('bid_history', 'y', 9.5)
                              updateElementProp('bid_history', 'w', 24)
                              updateElementProp('bid_history', 'h', 77)
                            }}
                            className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 font-bold text-xs cursor-pointer transition"
                          >
                            Reset Right Panel Position
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Header Title</label>
                            <input
                              type="text"
                              value={design.elements.bid_history?.title || design.elements.bid_history?.label || 'BID HISTORY'}
                              onChange={(e) => {
                                updateElementProp('bid_history', 'title', e.target.value)
                                updateElementProp('bid_history', 'label', e.target.value)
                              }}
                              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Max Visible Bids</label>
                            <div className="flex items-center gap-1">
                              {[5, 8, 12, 20].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => updateElementProp('bid_history', 'max_bids', num)}
                                  className={`flex-1 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                                    (design.elements.bid_history?.max_bids || 8) === num
                                      ? 'bg-purple-500 text-white border-purple-400'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Panel Theme</label>
                            <div className="flex items-center gap-1">
                              {[
                                { id: 'cyber', label: 'Cyber' },
                                { id: 'glass', label: 'Glass' },
                                { id: 'solid', label: 'Solid' },
                              ].map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => updateElementProp('bid_history', 'panel_theme', t.id)}
                                  className={`flex-1 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                                    (design.elements.bid_history?.panel_theme || 'cyber') === t.id
                                      ? 'bg-purple-500 text-white border-purple-400'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">Visible Columns</label>
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateElementProp(
                                    'bid_history',
                                    'show_short_name',
                                    design.elements.bid_history?.show_short_name === false ? true : false
                                  )
                                }
                                className={`py-1 px-1.5 rounded text-[11px] font-bold border transition cursor-pointer text-center ${
                                  design.elements.bid_history?.show_short_name !== false
                                    ? 'bg-purple-500 text-white border-purple-400'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                Short Name
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateElementProp(
                                    'bid_history',
                                    'show_team_name',
                                    design.elements.bid_history?.show_team_name === false ? true : false
                                  )
                                }
                                className={`py-1 px-1.5 rounded text-[11px] font-bold border transition cursor-pointer text-center ${
                                  design.elements.bid_history?.show_team_name !== false
                                    ? 'bg-purple-500 text-white border-purple-400'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                Team Name
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateElementProp(
                                    'bid_history',
                                    'show_bid_amount',
                                    design.elements.bid_history?.show_bid_amount === false ? true : false
                                  )
                                }
                                className={`py-1 px-1.5 rounded text-[11px] font-bold border transition cursor-pointer text-center ${
                                  design.elements.bid_history?.show_bid_amount !== false
                                    ? 'bg-purple-500 text-white border-purple-400'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                Bid Amount
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* 16:9 Interactive Full-Arena Canvas Stage */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-slate-800 shadow-2xl bg-slate-950">
            {/* Background Image / Preset */}
            {design.custom_background_url ? (
              <img
                src={design.custom_background_url}
                alt="Auction Stage Background"
                className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-40"
              />
            ) : design.background_mode === 'classic_turf' ? (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-950 pointer-events-none opacity-60" />
            ) : design.background_mode === 'dark_neon' ? (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950 pointer-events-none opacity-60" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />
            )}

            {/* Stage Canvas Area */}
            <div
              ref={canvasRef}
              onClick={(e) => {
                if (e.target === canvasRef.current) {
                  setSelectedKey(null)
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                setIsDraggingOverCanvas(true)
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) {
                  setIsDraggingOverCanvas(false)
                }
              }}
              onDrop={handleCanvasDrop}
              className={`relative aspect-video w-full select-none cursor-default overflow-hidden p-2 transition-all ${
                isDraggingOverCanvas
                  ? 'ring-4 ring-amber-400 bg-amber-500/10 shadow-2xl'
                  : ''
              }`}
              style={{
                backgroundImage: design.grid_visible
                  ? `radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)`
                  : 'none',
                backgroundSize: `${design.snap_grid * 2}% ${design.snap_grid * 2}%`,
              }}
            >
              {/* Drop Target Indicator when dragging over Canvas */}
              {isDraggingOverCanvas && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-xs border-4 border-dashed border-amber-400 pointer-events-none animate-pulse">
                  <div className="flex flex-col items-center gap-2.5 p-6 rounded-3xl bg-zinc-900/95 border border-amber-400/80 shadow-2xl text-center">
                    <Gavel className="w-10 h-10 text-amber-400 animate-bounce" />
                    <p className="text-sm font-black text-white uppercase tracking-wider">
                      Release to Drop & Position on Canvas Stage
                    </p>
                    <p className="text-xs text-amber-300 font-medium">
                      Item will be placed right at this location with Canva drag & resize handles
                    </p>
                  </div>
                </div>
              )}
              {/* Fixed Auction Zones Overlay (Visual Reference) */}
              <div className="absolute bottom-2 inset-x-4 flex items-center justify-between text-[10px] text-slate-500 font-mono pointer-events-none">
                <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  Team Columns: {design.zones.team_columns}
                </span>
                <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  Action Zone: {design.zones.action_zone_width}px
                </span>
                <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  Bid History: {design.zones.bid_history_width}px
                </span>
              </div>

              {/* Render Every Configured Stage Element */}
              {Object.entries(design.elements).map(([key, el]) => {
                if (!el.selected && selectedKey !== key) return null
                const isSelected = selectedKey === key
                const isHidden = !el.selected

                return (
                  <div
                    key={key}
                    onMouseDown={(e) => handleMouseDown(e, key)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedKey(key)
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation()
                      setSelectedKey(key)
                    }}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.w}%`,
                      height: `${el.h}%`,
                      color: el.colour || '#FFFFFF',
                    }}
                    className={`absolute flex items-center justify-center cursor-move transition-shadow rounded-lg ${
                      isSelected
                        ? isHidden
                          ? 'border-2 border-dashed border-red-400/80 bg-red-500/10 shadow-lg ring-2 ring-red-400/30 z-30'
                          : 'border-2 border-dashed border-amber-400 bg-amber-500/20 shadow-xl ring-2 ring-amber-400/50 z-30'
                        : 'border border-transparent hover:border-amber-400/50 hover:bg-white/5 z-10'
                    }`}
                  >
                    {isHidden && isSelected && (
                      <span className="absolute -top-4 left-1 bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded-xs shadow pointer-events-none z-40">
                        Hidden (Tap Show on Screen)
                      </span>
                    )}
                    {/* Element Renderers */}
                    <div className="w-full h-full flex items-center overflow-hidden px-1">
                      {key === 'tournament_title' && (
                        <div className="w-full h-full flex items-center justify-center gap-2 overflow-hidden px-1">
                          {branding.title_image_url ? (
                            <img
                              src={branding.title_image_url}
                              alt="Logo"
                              style={{ height: `${Math.max(16, Math.min(el.font_size || 26, 60))}px` }}
                              className={`object-contain pointer-events-none ${branding.remove_title_bg ? 'bg-transparent' : ''}`}
                            />
                          ) : (
                            <Shield
                              style={{
                                width: `${Math.max(16, Math.min(el.font_size || 26, 48))}px`,
                                height: `${Math.max(16, Math.min(el.font_size || 26, 48))}px`,
                              }}
                              className="text-amber-400 shrink-0 pointer-events-none"
                            />
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 26}px`,
                              color: el.colour || branding.title_colour || '#FFD54A',
                              fontFamily: el.font_family || 'Arial',
                            }}
                            className="font-black uppercase tracking-wider font-mono drop-shadow-md truncate pointer-events-none"
                          >
                            {branding.title_text || 'Test Tournament'}
                          </span>
                        </div>
                      )}

                      {key === 'player_photo' && (
                        <div className="w-full h-full flex flex-col items-center justify-center rounded-xl border border-white/20 bg-slate-900/90 overflow-hidden shadow-inner">
                          {samplePlayerData.photo_url ? (
                            <img
                              src={samplePlayerData.photo_url}
                              alt="Player"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                PLAYER PHOTO
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {key === 'player_name' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 42) * 0.3))}px` }}
                              className="text-slate-400 block uppercase font-bold"
                            >
                              Name
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 42}px`,
                              fontFamily: el.font_family || 'Arial',
                              fontWeight: el.bold !== false ? 900 : 600,
                              color: el.colour || '#FFFFFF',
                            }}
                            className="font-black tracking-tight uppercase line-clamp-1 drop-shadow-md"
                          >
                            {samplePlayerData.player_name}
                          </span>
                        </div>
                      )}

                      {key === 'player_category' && (
                        <div className="w-full" style={{ textAlign: el.align || 'center' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 22) * 0.45))}px` }}
                              className="text-amber-300 block font-bold"
                            >
                              CATEGORY:
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 22}px`,
                              fontWeight: 900,
                              color: el.colour || '#FFD54A',
                            }}
                            className="uppercase tracking-widest font-black drop-shadow"
                          >
                            {samplePlayerData.category}
                          </span>
                        </div>
                      )}

                      {key === 'player_number' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 16) * 0.6))}px` }}
                              className="text-slate-400 font-bold mr-1"
                            >
                              NO.{' '}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 16}px`,
                              color: el.colour || '#B8C7DA',
                            }}
                            className="font-mono font-bold"
                          >
                            PLAYER {samplePlayerData.player_number}
                          </span>
                        </div>
                      )}

                      {key === 'role' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 18) * 0.55))}px` }}
                              className="text-slate-400 mr-1 font-bold"
                            >
                              Role:{' '}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 18}px`,
                              color: el.colour || '#D8E2EF',
                            }}
                            className="font-bold capitalize"
                          >
                            {samplePlayerData.role}
                          </span>
                        </div>
                      )}

                      {key === 'batting_style' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                              className="text-slate-400 mr-1 font-bold"
                            >
                              BATTING •{' '}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 14}px`,
                              color: el.colour || '#FFFFFF',
                            }}
                            className="font-semibold"
                          >
                            {samplePlayerData.batting_style}
                          </span>
                        </div>
                      )}

                      {key === 'bowling_style' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                              className="text-slate-400 mr-1 font-bold"
                            >
                              BOWLING •{' '}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 14}px`,
                              color: el.colour || '#FFFFFF',
                            }}
                            className="font-semibold"
                          >
                            {samplePlayerData.bowling_style}
                          </span>
                        </div>
                      )}

                      {key === 'location' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                              className="text-slate-400 mr-1 font-bold"
                            >
                              {el.custom_label || 'LOCATION'}{' '}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 14}px`,
                              color: el.colour || '#FFFFFF',
                            }}
                            className="font-semibold"
                          >
                            {el.custom_text || samplePlayerData.location}
                          </span>
                        </div>
                      )}

                      {key === 'current_bid' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 46) * 0.28))}px` }}
                              className="uppercase font-bold text-amber-400/90 block"
                            >
                              {el.custom_label || 'CURRENT BID'}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 46}px`,
                              color: el.colour || '#FFD54A',
                            }}
                            className="font-black font-mono tracking-tight drop-shadow-lg"
                          >
                            {el.custom_text || `₹${samplePlayerData.current_bid.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      )}

                      {key === 'bidder_name' && (
                        <div
                          className="w-full flex items-center gap-2"
                          style={{
                            justifyContent:
                              el.align === 'center'
                                ? 'center'
                                : el.align === 'left'
                                ? 'flex-start'
                                : 'flex-end',
                            textAlign: el.align || 'right',
                          }}
                        >
                          {el.show_team_logo !== false && (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                              <Shield className="w-4 h-4 text-sky-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            {el.show_label && (
                              <span
                                style={{
                                  fontSize: `${Math.max(9, Math.round((el.font_size || 22) * 0.45))}px`,
                                }}
                                className="text-slate-400 block font-bold"
                              >
                                {el.custom_label || 'BIDDER TEAM'}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: `${el.font_size || 22}px`,
                                color: el.colour || '#FFFFFF',
                                fontFamily: el.font_family || 'inherit',
                                fontWeight: el.bold === false ? 500 : 900,
                                fontStyle: el.italic ? 'italic' : 'normal',
                                textDecoration: el.underline ? 'underline' : 'none',
                                whiteSpace: el.fit_to_size ? 'nowrap' : 'normal',
                              }}
                              className="font-black uppercase tracking-wide truncate block"
                            >
                              {el.custom_text || samplePlayerData.bidder_name}
                            </span>
                          </div>
                        </div>
                      )}

                      {key === 'base_price' && (
                        <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 20) * 0.55))}px` }}
                              className="text-slate-400 mr-1.5 uppercase font-bold"
                            >
                              {el.custom_label || 'BASE PRICE'}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 20}px`,
                              color: el.colour || '#FFFFFF',
                            }}
                            className="font-extrabold font-mono"
                          >
                            {el.custom_text || `₹${samplePlayerData.base_price.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      )}

                      {key === 'balance' && (
                        <div className="w-full" style={{ textAlign: el.align || 'right' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                              className="text-slate-400 mr-1 font-bold"
                            >
                              {el.custom_label || 'Bal.'}{' '}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 14}px`,
                              color: el.colour || '#B9C7D7',
                            }}
                            className="font-mono font-bold"
                          >
                            {el.custom_text || `₹${samplePlayerData.balance.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      )}

                      {key === 'max_bid' && (
                        <div className="w-full" style={{ textAlign: el.align || 'right' }}>
                          {el.show_label && (
                            <span
                              style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                              className="text-amber-300 mr-1 font-bold"
                            >
                              Max Bid{' '}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: `${el.font_size || 14}px`,
                              color: el.colour || '#FFD54A',
                            }}
                            className="font-mono font-bold"
                          >
                            ₹{samplePlayerData.max_bid.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {/* Top Arena Status Bar Element (Configurable / Draggable / Resizable) */}
                      {key === 'top_bar' && (
                        <div className="w-full h-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-blue-900/60 bg-[#031124]/90 backdrop-blur-xs select-none shadow-md overflow-hidden">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              style={{
                                fontSize: `${el.font_size || 13}px`,
                                color: el.colour || '#FFD54A',
                              }}
                              className="font-black uppercase tracking-wider truncate"
                            >
                              CATEGORY: {samplePlayerData.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900 text-slate-200 font-mono font-bold text-xs">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>30s</span>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white font-bold text-xs border border-white/15">
                              <Maximize2 className="w-3 h-3 text-sky-400" />
                              <span>Full Screen</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bid History Stream Panel Element (Configurable / Draggable / Resizable) */}
                      {key === 'bid_history' && (
                        <div
                          className={`w-full h-full flex flex-col justify-between rounded-2xl p-3 shadow-2xl select-none overflow-hidden ${
                            el.panel_theme === 'glass'
                              ? 'bg-slate-900/60 backdrop-blur-md border border-white/20'
                              : el.panel_theme === 'solid'
                              ? 'bg-black/95 border border-amber-500/30'
                              : 'bg-[#030f1e]/95 border border-blue-900/60 backdrop-blur-xs'
                          }`}
                          style={{ borderRadius: `${el.border_radius ?? 16}px` }}
                        >
                          <div className="space-y-2 overflow-hidden flex-1 flex flex-col">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 shrink-0">
                              <span
                                style={{
                                  fontSize: `${el.font_size || 12}px`,
                                  color: el.colour || '#E2E8F0',
                                }}
                                className="font-black uppercase tracking-wider"
                              >
                                {el.title || el.label || 'BID HISTORY'}
                              </span>
                              <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
                              </span>
                            </div>
                            <span className="font-extrabold text-white text-xs block truncate shrink-0">
                              {samplePlayerData.player_name}
                            </span>
                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                                  {el.show_short_name !== false && (
                                    <span className="font-mono font-black text-amber-300 bg-amber-500/20 px-1 rounded text-[10px] shrink-0">CYC</span>
                                  )}
                                  {el.show_team_name !== false && (
                                    <span className="font-bold text-white truncate">{samplePlayerData.bidder_name}</span>
                                  )}
                                </div>
                                {el.show_bid_amount !== false && (
                                  <span className="font-mono font-black text-amber-400 shrink-0 ml-1">
                                    ₹{samplePlayerData.current_bid.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                              <div className="p-2 rounded-xl bg-white/5 flex justify-between items-center text-slate-400 text-xs">
                                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                                  {el.show_short_name !== false && (
                                    <span className="font-mono font-black text-slate-300 bg-white/10 px-1 rounded text-[10px] shrink-0">TT</span>
                                  )}
                                  {el.show_team_name !== false && (
                                    <span className="truncate">TITANS</span>
                                  )}
                                </div>
                                {el.show_bid_amount !== false && (
                                  <span className="font-mono text-slate-300 shrink-0 ml-1">₹3,50,000</span>
                                )}
                              </div>
                              <div className="p-2 rounded-xl bg-white/5 flex justify-between items-center text-slate-400 text-xs">
                                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                                  {el.show_short_name !== false && (
                                    <span className="font-mono font-black text-slate-300 bg-white/10 px-1 rounded text-[10px] shrink-0">RYL</span>
                                  )}
                                  {el.show_team_name !== false && (
                                    <span className="truncate">ROYALS</span>
                                  )}
                                </div>
                                {el.show_bid_amount !== false && (
                                  <span className="font-mono text-slate-300 shrink-0 ml-1">₹3,00,000</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-white/10 text-[9px] text-slate-400 text-center tracking-wider uppercase font-semibold shrink-0">
                            Arena Live History
                          </div>
                        </div>
                      )}

                      {/* Bottom Action & Player Bar Element (Configurable / Draggable / Resizable) */}
                      {key === 'action_bar' && (
                        <div
                          className="w-full h-full flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#031326]/95 border border-blue-900/60 backdrop-blur-xs select-none overflow-hidden shadow-lg"
                          style={{ borderRadius: `${el.border_radius ?? 12}px` }}
                        >
                          <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-0.5">
                              Action:
                            </span>
                            {currentActionButtons
                              .filter((btn) => btn.visible)
                              .map((btn) => {
                                switch (btn.id) {
                                  case 'sold':
                                    return (
                                      <span
                                        key={btn.id}
                                        className="bg-emerald-600 font-extrabold text-white text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs shrink-0 cursor-default"
                                      >
                                        <Gavel className="w-3 h-3" />
                                        <span>{btn.label}</span>
                                      </span>
                                    )
                                  case 'unsold':
                                    return (
                                      <span
                                        key={btn.id}
                                        className="bg-rose-600 font-extrabold text-white text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs shrink-0 cursor-default"
                                      >
                                        <XCircle className="w-3 h-3" />
                                        <span>{btn.label}</span>
                                      </span>
                                    )
                                  case 'custom_bid':
                                    return (
                                      <span
                                        key={btn.id}
                                        className="bg-amber-500 font-black text-zinc-950 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs shrink-0 cursor-default"
                                      >
                                        <Flame className="w-3 h-3 text-zinc-950" />
                                        <span>{btn.label}</span>
                                      </span>
                                    )
                                  case 'undo_sale':
                                    return (
                                      <span
                                        key={btn.id}
                                        className="text-[10px] text-slate-200 bg-white/10 border border-white/15 px-2 py-1 rounded-lg font-semibold flex items-center gap-1 shrink-0 cursor-default"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" />
                                        <span>{btn.label}</span>
                                      </span>
                                    )
                                  case 'undo_bid':
                                  case 'reset_bid':
                                    return (
                                      <span
                                        key={btn.id}
                                        className="text-[10px] text-slate-200 bg-white/10 border border-white/15 px-2 py-1 rounded-lg font-semibold shrink-0 cursor-default"
                                      >
                                        <span>{btn.label}</span>
                                      </span>
                                    )
                                  default:
                                    return null
                                }
                              })}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-slate-400 font-mono text-[10px]">PLAYER NO:</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs">
                              1
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-500 font-black text-zinc-950 text-xs shadow-xs cursor-default">
                              SHOW
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Franchise Bidding Stations Element (Configurable / Option 4 Geometry) */}
                      {key === 'franchise_stations' && (
                        <div
                          className="w-full h-full p-1.5 rounded-xl bg-[#030f1e]/90 border border-blue-900/60 backdrop-blur-xs select-none overflow-hidden flex flex-col justify-center shadow-lg"
                          style={{ borderRadius: `${el.border_radius ?? 12}px` }}
                        >
                          <div
                            className="w-full h-full grid"
                            style={{
                              gridTemplateColumns: `repeat(${el.grid_cols || 7}, minmax(0, 1fr))`,
                              gridTemplateRows: `repeat(${el.grid_rows || 2}, minmax(0, 1fr))`,
                              columnGap: `${el.gap_x || 6}px`,
                              rowGap: `${el.gap_y || 6}px`,
                            }}
                          >
                            {SAMPLE_FRANCHISE_TEAMS.slice(0, Math.min(14, (el.grid_cols || 7) * (el.grid_rows || 2))).map((t, idx) => {
                              const isSolid = (el.box_style || 'solid') === 'solid'
                              return (
                                <div
                                  key={t.id}
                                  className="flex flex-col justify-between p-1 rounded-md overflow-hidden transition select-none min-w-0"
                                  style={{
                                    backgroundColor: isSolid ? `${t.color}25` : 'transparent',
                                    borderColor: t.color,
                                    borderWidth: isSolid ? '1px' : '2px',
                                    borderStyle: 'solid',
                                    boxShadow: isSolid ? `0 0 8px ${t.color}20` : 'none',
                                    writingMode: 'horizontal-tb',
                                  }}
                                >
                                  <div
                                    className="flex items-center justify-between text-[8px] font-bold text-slate-400 shrink-0"
                                    style={{ writingMode: 'horizontal-tb' }}
                                  >
                                    {el.show_number !== false && (
                                      <span className="px-1 py-0.2 rounded bg-black/50 font-mono text-[8px] text-white">
                                        #{idx + 1}
                                      </span>
                                    )}
                                    <span className="font-mono text-[8px] text-slate-400 opacity-75">
                                      [{idx + 1}]
                                    </span>
                                  </div>
                                  <div
                                    className="w-full text-center font-black truncate my-auto px-0.5"
                                    style={{
                                      fontSize: `${el.font_size || 13}px`,
                                      color: el.colour || t.color,
                                      fontFamily: el.font_family || 'inherit',
                                      fontWeight: el.bold !== false ? 900 : 700,
                                      fontStyle: el.italic ? 'italic' : 'normal',
                                      writingMode: 'horizontal-tb',
                                      whiteSpace: 'nowrap',
                                      textOrientation: 'mixed',
                                    }}
                                  >
                                    {t.code}
                                  </div>
                                  {el.show_balance !== false && (
                                    <div
                                      className="w-full text-center font-mono text-[8px] text-slate-300/80 truncate shrink-0"
                                      style={{ writingMode: 'horizontal-tb', whiteSpace: 'nowrap' }}
                                    >
                                      {t.balance}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom Photo Box Element */}
                      {(el.type === 'photo' || key.startsWith('custom_photo')) && (
                        <div
                          className="w-full h-full relative rounded-xl overflow-hidden border border-white/20 bg-slate-900/80 shadow-md flex items-center justify-center select-none"
                          style={{ borderRadius: `${el.border_radius ?? 12}px` }}
                        >
                          {el.media_url ? (
                            <img
                              src={el.media_url}
                              alt={el.label || 'Custom Photo'}
                              style={{ objectFit: el.object_fit || 'cover' }}
                              className="w-full h-full pointer-events-none"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                              <ImageIcon className="w-8 h-8 text-amber-400/80 mb-1 pointer-events-none" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 pointer-events-none">
                                {el.label || 'Custom Photo Box'}
                              </span>
                              <span className="text-[9px] text-slate-400 pointer-events-none">
                                Click to attach photo in toolbar
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom Video Box Element */}
                      {(el.type === 'video' || key.startsWith('custom_video')) && (
                        <div
                          className="w-full h-full relative rounded-xl overflow-hidden border border-sky-500/30 bg-slate-950 shadow-md flex items-center justify-center select-none"
                          style={{ borderRadius: `${el.border_radius ?? 12}px` }}
                        >
                          {el.video_url || el.media_url ? (
                            <video
                              src={el.video_url || el.media_url}
                              autoPlay
                              loop
                              muted
                              playsInline
                              style={{ objectFit: el.object_fit || 'cover' }}
                              className="w-full h-full pointer-events-none"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                              <Video className="w-8 h-8 text-sky-400 mb-1 pointer-events-none" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 pointer-events-none">
                                {el.label || 'Custom Video Stream'}
                              </span>
                              <span className="text-[9px] text-slate-400 pointer-events-none">
                                Click to set video in toolbar
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom Text Box Element */}
                      {(el.type === 'text' || key.startsWith('custom_text')) && (
                        <div
                          className="w-full h-full flex items-center overflow-hidden px-2 rounded-lg select-none"
                          style={{
                            textAlign: el.align || 'center',
                            justifyContent:
                              el.align === 'left'
                                ? 'flex-start'
                                : el.align === 'right'
                                ? 'flex-end'
                                : 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: `${el.font_size || 18}px`,
                              color: el.colour || '#FFFFFF',
                              fontWeight: el.bold !== false ? 'bold' : 'normal',
                            }}
                            className="uppercase tracking-wider block drop-shadow truncate pointer-events-none"
                          >
                            {el.custom_text || el.label || 'Custom Announcement'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Resize Arrow Handles (8 Directions) when element is Selected */}
                    {isSelected && (
                      <>
                        {/* Top-Left */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 'nw')}
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-950 rounded-sm cursor-nwse-resize shadow flex items-center justify-center hover:scale-125 transition"
                          title="Resize with arrow"
                        />
                        {/* Top-Right */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 'ne')}
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-950 rounded-sm cursor-nesw-resize shadow flex items-center justify-center hover:scale-125 transition"
                          title="Resize with arrow"
                        />
                        {/* Bottom-Right */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 'se')}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-950 rounded-sm cursor-nwse-resize shadow flex items-center justify-center hover:scale-125 transition"
                          title="Resize with arrow"
                        />
                        {/* Bottom-Left */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 'sw')}
                          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-slate-950 rounded-sm cursor-nesw-resize shadow flex items-center justify-center hover:scale-125 transition"
                          title="Resize with arrow"
                        />

                        {/* Edge Handles */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 'n')}
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-400/90 rounded-xs cursor-ns-resize"
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 's')}
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-400/90 rounded-xs cursor-ns-resize"
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 'w')}
                          className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-amber-400/90 rounded-xs cursor-ew-resize"
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, key, 'e')}
                          className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-amber-400/90 rounded-xs cursor-ew-resize"
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Properties Bar for Active Selected Element */}
          {selectedKey && design.elements[selectedKey] && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-card shadow-xs text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground uppercase">
                  {ELEMENT_LABELS[selectedKey]?.label || selectedKey}
                </span>
                <span className="text-muted-foreground font-mono">
                  (X: {design.elements[selectedKey].x}%, Y: {design.elements[selectedKey].y}%, W: {design.elements[selectedKey].w}%, H: {design.elements[selectedKey].h}%)
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Font Size Adjust */}
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Size:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDesign((prev) => {
                        const copy = { ...prev, elements: { ...prev.elements } }
                        const cur = copy.elements[selectedKey].font_size || 20
                        copy.elements[selectedKey] = {
                          ...copy.elements[selectedKey],
                          font_size: Math.max(10, cur - 2),
                        }
                        return copy
                      })
                    }
                    className="p-1 rounded bg-muted hover:bg-muted/80 font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold w-6 text-center">
                    {design.elements[selectedKey].font_size || 20}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDesign((prev) => {
                        const copy = { ...prev, elements: { ...prev.elements } }
                        const cur = copy.elements[selectedKey].font_size || 20
                        copy.elements[selectedKey] = {
                          ...copy.elements[selectedKey],
                          font_size: Math.min(96, cur + 2),
                        }
                        return copy
                      })
                    }
                    className="p-1 rounded bg-muted hover:bg-muted/80 font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Color Picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Color:</span>
                  <input
                    type="color"
                    value={design.elements[selectedKey].colour || '#FFFFFF'}
                    onChange={(e) =>
                      setDesign((prev) => {
                        const copy = { ...prev, elements: { ...prev.elements } }
                        copy.elements[selectedKey] = {
                          ...copy.elements[selectedKey],
                          colour: e.target.value,
                        }
                        return copy
                      })
                    }
                    className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                </div>

                {/* Show Field Label Toggle */}
                <button
                  type="button"
                  onClick={() => toggleElementLabel(selectedKey)}
                  className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] ${
                    design.elements[selectedKey].show_label
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-600'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  Label: {design.elements[selectedKey].show_label ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {/* Live Action Controls Preview & Canvas Drag Anchor */}
          <div
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/turf-element', 'action_bar')
              e.dataTransfer.setData('text/plain', 'action_bar')
            }}
            className="rounded-2xl border-2 border-emerald-500/40 bg-card p-4 shadow-md space-y-3 cursor-grab active:cursor-grabbing hover:border-emerald-400 transition"
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-emerald-400" />
                <h4 className="font-extrabold text-sm text-foreground">
                  Live Action Controls Preview
                </h4>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {currentActionButtons.filter((b) => b.visible).length} visible
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddCustomBox('action_bar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
                title="Click or Drag onto Canvas Stage"
              >
                <Move className="w-3.5 h-3.5" />
                <span>
                  {design.elements.action_bar?.selected ? 'Focus on Stage' : '+ Add to Canvas'}
                </span>
              </button>
            </div>

            {/* Canvas Stage Status & Quick Snap Placement */}
            <div className="space-y-2">
              {design.elements.action_bar?.selected ? (
                <div className="flex items-center justify-between text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl font-medium">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Placed on Canvas Stage
                    <span className="text-[10px] font-mono opacity-80">
                      (X: {design.elements.action_bar.x}%, Y: {design.elements.action_bar.y}%)
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKey('action_bar')
                      canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="text-[10px] font-extrabold text-amber-400 hover:underline cursor-pointer"
                  >
                    Select & Drag
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl font-medium">
                  <span>Not placed on canvas yet</span>
                  <button
                    type="button"
                    onClick={() => handleAddCustomBox('action_bar')}
                    className="text-[10px] font-black underline cursor-pointer hover:text-amber-300"
                  >
                    Click or Drag to Canvas
                  </button>
                </div>
              )}

              {/* Quick Placement Snap Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground font-bold shrink-0">Snap:</span>
                <button
                  type="button"
                  onClick={() => {
                    handleAddCustomBox('action_bar')
                    updateElementProp('action_bar', 'x', 2)
                    updateElementProp('action_bar', 'y', 88)
                    updateElementProp('action_bar', 'w', 96)
                    updateElementProp('action_bar', 'h', 10)
                  }}
                  className="flex-1 py-1 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground border border-border transition cursor-pointer text-center"
                >
                  Bottom Bar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddCustomBox('action_bar')
                    updateElementProp('action_bar', 'x', 2)
                    updateElementProp('action_bar', 'y', 1.5)
                    updateElementProp('action_bar', 'w', 96)
                    updateElementProp('action_bar', 'h', 10)
                  }}
                  className="flex-1 py-1 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground border border-border transition cursor-pointer text-center"
                >
                  Top Ticker
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddCustomBox('action_bar')
                    updateElementProp('action_bar', 'x', 18)
                    updateElementProp('action_bar', 'y', 86)
                    updateElementProp('action_bar', 'w', 64)
                    updateElementProp('action_bar', 'h', 11)
                  }}
                  className="flex-1 py-1 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground border border-border transition cursor-pointer text-center"
                >
                  Floating Center
                </button>
              </div>
            </div>

            {/* Draggable Buttons Preview Container */}
            <div
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/turf-element', 'action_bar')
                e.dataTransfer.setData('text/plain', 'action_bar')
              }}
              title="Drag this entire bar or any button onto the canvas stage"
              className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#030d1a] border border-blue-900/40 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition shadow-inner"
              style={{
                maxWidth: design.zones.action_zone_width
                  ? `${design.zones.action_zone_width}px`
                  : undefined,
              }}
            >
              {currentActionButtons
                .filter((btn) => btn.visible)
                .map((btn) => {
                  switch (btn.id) {
                    case 'sold':
                      return (
                        <div
                          key={btn.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/turf-element', 'action_bar')
                            e.dataTransfer.setData('text/plain', 'action_bar')
                          }}
                          className="bg-emerald-600 font-extrabold text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-grab active:cursor-grabbing hover:brightness-110 transition"
                          title="Drag to Canvas Stage"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          <span>{btn.label}</span>
                        </div>
                      )
                    case 'unsold':
                      return (
                        <div
                          key={btn.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/turf-element', 'action_bar')
                            e.dataTransfer.setData('text/plain', 'action_bar')
                          }}
                          className="bg-rose-600 font-extrabold text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-grab active:cursor-grabbing hover:brightness-110 transition"
                          title="Drag to Canvas Stage"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{btn.label}</span>
                        </div>
                      )
                    case 'custom_bid':
                      return (
                        <div
                          key={btn.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/turf-element', 'action_bar')
                            e.dataTransfer.setData('text/plain', 'action_bar')
                          }}
                          className="bg-amber-500 font-black text-zinc-950 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-grab active:cursor-grabbing hover:brightness-110 transition"
                          title="Drag to Canvas Stage"
                        >
                          <Flame className="w-3.5 h-3.5 text-zinc-950" />
                          <span>{btn.label}</span>
                        </div>
                      )
                    case 'undo_sale':
                      return (
                        <div
                          key={btn.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/turf-element', 'action_bar')
                            e.dataTransfer.setData('text/plain', 'action_bar')
                          }}
                          className="text-xs text-slate-200 bg-white/10 border border-white/15 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-grab active:cursor-grabbing hover:bg-white/20 transition"
                          title="Drag to Canvas Stage"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{btn.label}</span>
                        </div>
                      )
                    case 'undo_bid':
                      return (
                        <div
                          key={btn.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/turf-element', 'action_bar')
                            e.dataTransfer.setData('text/plain', 'action_bar')
                          }}
                          className="text-xs text-slate-200 bg-white/10 border border-white/15 px-2.5 py-1.5 rounded-lg font-semibold cursor-grab active:cursor-grabbing hover:bg-white/20 transition"
                          title="Drag to Canvas Stage"
                        >
                          <span>{btn.label}</span>
                        </div>
                      )
                    case 'reset_bid':
                      return (
                        <div
                          key={btn.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/turf-element', 'action_bar')
                            e.dataTransfer.setData('text/plain', 'action_bar')
                          }}
                          className="text-xs text-slate-200 bg-white/10 border border-white/15 px-2.5 py-1.5 rounded-lg font-semibold cursor-grab active:cursor-grabbing hover:bg-white/20 transition"
                          title="Drag to Canvas Stage"
                        >
                          <span>{btn.label}</span>
                        </div>
                      )
                    default:
                      return null
                  }
                })}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1.5">
              <span>💡</span>
              <span>
                <strong>Drag & Drop:</strong> Drag this box or any button directly onto the canvas stage, or click <em>"+ Add to Canvas"</em>. Drag freely and use the 8 handles to resize.
              </span>
            </p>
          </div>

          {/* Franchise Bidding Stations Live Preview & Customizer Card */}
          <div className="rounded-2xl border-2 border-amber-500/30 bg-card p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-amber-500" />
                <div>
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    Franchise Bidding Stations ({design.zones?.team_columns || 4} Columns)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Unique sequence colors, smart team shortcuts (e.g. Mumbai Indians → MI) and numeric key logic (1-9).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Column Dropdown on Preview Card */}
                <div className="flex items-center gap-1.5 bg-muted/70 border border-border px-2.5 py-1 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Columns:</span>
                  <select
                    value={design.zones?.team_columns || 4}
                    onChange={(e) => {
                      const cols = Number(e.target.value)
                      setDesign((prev) => ({
                        ...prev,
                        zones: { ...prev.zones, team_columns: cols },
                      }))
                    }}
                    className="bg-transparent text-amber-500 font-black text-xs cursor-pointer focus:outline-none"
                  >
                    <option value={2}>2 Columns</option>
                    <option value={3}>3 Columns</option>
                    <option value={4}>4 Columns (Standard)</option>
                    <option value={5}>5 Columns</option>
                    <option value={6}>6 Columns</option>
                    <option value={7}>7 Columns</option>
                    <option value={8}>8 Columns</option>
                    <option value={10}>10 Columns</option>
                    <option value={12}>12 Columns</option>
                    <option value={14}>14 Columns</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Feedback Alert */}
            {previewStationFeedback && (
              <div className="text-xs bg-amber-500/15 border border-amber-500/40 text-amber-500 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{previewStationFeedback}</span>
              </div>
            )}

            {/* Dynamic Station Grid matching configured columns */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  2,
                  Math.min(14, design.zones?.team_columns || 4)
                )}, minmax(0, 1fr))`,
              }}
            >
              {(liveTeams.length > 0
                ? liveTeams
                : Array.from({ length: Math.min(8, design.zones?.team_columns || 4) }, (_, i) => ({
                    team_id: String(i + 1),
                    team_name: `Team ${i + 1}`,
                    short_name: `T${i + 1}`,
                    balance: 0,
                    max_bid: 0,
                  }))
              ).map((team: any, idx: number, arr: any[]) => {
                const theme = getTeamTheme(idx, arr.length)
                const shortcut = getTeamShortcut(team.team_name, team.short_name)

                return (
                  <div
                    key={team.team_id || team.team_name || idx}
                    onClick={() => {
                      setPreviewStationFeedback(`Selected #${theme.sequenceNo} ${shortcut} (${team.team_name}) • Keyboard Key [${theme.keyShortcut}]`)
                      setTimeout(() => setPreviewStationFeedback(null), 3000)
                    }}
                    style={{
                      background: 'rgba(2, 19, 46, 0.95)',
                      borderColor: theme.border,
                      boxShadow: `0 0 8px ${theme.glow}`,
                    }}
                    className="group relative flex flex-col items-center justify-center rounded-xl border-2 p-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
                    title={`Team #${theme.sequenceNo}: ${team.team_name} (Key [${theme.keyShortcut}]) • Purse: ₹${Number(team.balance || 0).toLocaleString('en-IN')}`}
                  >
                    {/* Top Row: Sequence Badge & Key */}
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                        className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black shadow-xs"
                      >
                        #{theme.sequenceNo}
                      </span>
                      {theme.keyShortcut && (
                        <span className="text-[9px] font-mono font-bold bg-black/40 text-slate-300 px-1 py-0.2 rounded border border-white/10">
                          [{theme.keyShortcut}]
                        </span>
                      )}
                    </div>

                    {/* Centered Shortcut Text (Matching User's Screenshot) */}
                    <span
                      style={{ color: theme.pillText }}
                      className="text-lg font-black font-mono tracking-wider drop-shadow-md py-0.5"
                    >
                      {shortcut}
                    </span>

                    {/* Compact Purse */}
                    <span className="text-[10px] font-mono font-extrabold text-emerald-400 mt-1">
                      ₹{Number(team.balance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>⚡</span>
              <span>
                <strong>Live Sync:</strong> Changes to columns will automatically reflect in the live auction broadcast arena and persist when you tap <em>"Save Page Design"</em>.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ================= SCREEN TEMPLATES MODAL ================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-500" />
                  <h3 className="text-xl font-black text-foreground tracking-tight">
                    Auction Screen Templates Library
                  </h3>
                  <span className="text-xs bg-amber-500/20 text-amber-500 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {PRESET_TEMPLATES.length + customTemplates.length} Available
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Apply instant pro stadium themes or save your current customized screen configuration for one-click reuse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Save Current Screen Layout Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-500 font-extrabold text-sm">
                <BookmarkPlus className="w-4 h-4" />
                <span>Save Current Screen Layout as a Template</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Give your current layout a title to save it locally. You can instantly reload it anytime.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. IPL 2026 Night Stadium Final"
                  className="rounded-xl border-border bg-background text-foreground text-xs font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveAsTemplate()
                    }
                  }}
                />
                <Button
                  onClick={handleSaveAsTemplate}
                  disabled={!newTemplateName.trim()}
                  className="shrink-0 bg-amber-500 text-slate-950 font-black hover:bg-amber-400 rounded-xl text-xs shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Save Layout
                </Button>
              </div>
            </div>

            {/* Custom Templates Section */}
            {customTemplates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Your Saved Screen Templates ({customTemplates.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2.5 flex flex-col justify-between hover:border-amber-500/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-sm text-foreground">{tpl.name}</h5>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tpl.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <Button
                          size="sm"
                          onClick={() => handleApplyTemplate(tpl)}
                          className="bg-amber-500 text-slate-950 font-extrabold hover:bg-amber-400 rounded-xl text-xs shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Apply Template
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomTemplate(tpl.id)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Built-in Presets Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-amber-500" /> Official Stadium & Broadcast Presets
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESET_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-2xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                          {tpl.name}
                        </h5>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            tpl.badge === 'DEFAULT'
                              ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                          }`}
                        >
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {Object.values(tpl.design.elements).filter((e) => e.selected).length} zones active
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="bg-amber-500 text-slate-950 font-extrabold hover:bg-amber-400 rounded-xl text-xs shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Apply Preset
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
