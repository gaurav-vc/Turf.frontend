import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Save,
  CheckCircle2,
  Grid,
  Users,
  Printer,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Layers,
  Image as ImageIcon,
  Move,
  Trash2,
  Sliders,
  Sparkles,
  UploadCloud,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Type,
  PanelTop,
  PanelBottom,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  BookOpen,
  Download,
  Shield,
  Crown,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface PdfDesignStudioProps {
  auctionId: string
}

export type ActiveSection =
  | 'page_grid'
  | 'header'
  | 'footer'
  | 'cover_page'
  | 'teams_designer'
  | 'owners_designer'
  | 'card_elements'

export interface CoverPageConfig {
  title: string
  subtitle: string
  show_logo: boolean
  logo_url: string
  show_stats: boolean
  date_venue: string
  bg_colour: string
  text_colour: string
  accent_colour: string
}

export interface TeamsDesignerConfig {
  show_purse: boolean
  show_captain: boolean
  show_squad_stats: boolean
  team_card_theme: 'solid' | 'gradient' | 'bordered'
}

export interface OwnersDesignerConfig {
  show_purse: boolean
  show_contact: boolean
  show_avatar: boolean
}

const DEFAULT_COVER_CONFIG: CoverPageConfig = {
  title: 'TURF TOURNAMENT AUCTION',
  subtitle: 'Official Multi-Page Tournament Booklet & Auction Catalog',
  show_logo: true,
  logo_url: '',
  show_stats: true,
  date_venue: 'Main Arena • Live Auction Broadcast',
  bg_colour: '#0f172a',
  text_colour: '#ffffff',
  accent_colour: '#4f46e5',
}

const DEFAULT_TEAMS_CONFIG: TeamsDesignerConfig = {
  show_purse: true,
  show_captain: true,
  show_squad_stats: true,
  team_card_theme: 'solid',
}

const DEFAULT_OWNERS_CONFIG: OwnersDesignerConfig = {
  show_purse: true,
  show_contact: true,
  show_avatar: true,
}

export interface PlacedLogo {
  id: string
  url: string
  name: string
  x: number // %
  y: number // %
  width: number // %
}

export interface CardElement {
  selected: boolean
  x: number // %
  y: number // %
  w: number // %
  h: number // %
  font_size: number
  font_family: string
  colour: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  italic: boolean
  show_label: boolean
  label?: string
  custom_text?: string
  is_custom?: boolean
  bg_colour?: string
  bg_opacity?: number // % (0-100)
  z: number
}

export interface PdfHeaderConfig {
  show: boolean
  title: string
  right_text: string
  height: number // points / px
  font_size: number
  bg_colour: string
  text_colour: string
}

export interface PdfFooterConfig {
  show: boolean
  left_text: string
  center_text: string
  right_text: string
  height: number
  font_size: number
  bg_colour: string
  text_colour: string
}

const DEFAULT_HEADER_CONFIG: PdfHeaderConfig = {
  show: true,
  title: 'Category: Icon Players',
  right_text: 'Every category on new page',
  height: 28,
  font_size: 11,
  bg_colour: '#f8fafc',
  text_colour: '#0f172a',
}

const DEFAULT_FOOTER_CONFIG: PdfFooterConfig = {
  show: true,
  left_text: 'Official Auction Sheet • Confidential',
  center_text: 'Page {page} of {totalPages}',
  right_text: 'Turf Tournament Auction',
  height: 22,
  font_size: 8.5,
  bg_colour: '#f8fafc',
  text_colour: '#64748b',
}

const DEFAULT_CARD_ELEMENTS: Record<string, CardElement> = {
  player_number: { selected: true, x: 38, y: 6, w: 24, h: 12, font_size: 13, font_family: 'Helvetica-Bold', colour: '#0284c7', align: 'left', bold: true, italic: false, show_label: false, label: 'No:', z: 2 },
  player_photo: { selected: true, x: 4, y: 6, w: 30, h: 86, font_size: 10, font_family: 'Helvetica', colour: '#000000', align: 'center', bold: false, italic: false, show_label: true, label: '', z: 2 },
  name: { selected: true, x: 38, y: 19, w: 58, h: 14, font_size: 14, font_family: 'Helvetica-Bold', colour: '#0f172a', align: 'left', bold: true, italic: false, show_label: false, label: 'Name:', z: 2 },
  category: { selected: true, x: 62, y: 6, w: 34, h: 12, font_size: 10, font_family: 'Helvetica-Bold', colour: '#7c3aed', align: 'right', bold: true, italic: false, show_label: false, label: 'Cat:', z: 2 },
  base_price: { selected: true, x: 38, y: 44, w: 58, h: 14, font_size: 11, font_family: 'Helvetica-Bold', colour: '#16a34a', align: 'left', bold: true, italic: false, show_label: true, label: 'Base Price:', z: 2 },
  role: { selected: true, x: 38, y: 32, w: 58, h: 12, font_size: 10, font_family: 'Helvetica', colour: '#334155', align: 'left', bold: false, italic: false, show_label: false, label: 'Role:', z: 2 },
  location: { selected: true, x: 38, y: 58, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, label: 'Loc:', z: 2 },
  batting: { selected: true, x: 68, y: 58, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, label: 'Bat:', z: 2 },
  bowling: { selected: true, x: 38, y: 70, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, label: 'Bowl:', z: 2 },
  mobile: { selected: true, x: 68, y: 70, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, label: 'Mob:', z: 2 },
  age: { selected: true, x: 38, y: 82, w: 18, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, label: 'Age:', z: 2 },
  experience: { selected: true, x: 57, y: 82, w: 20, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, label: 'Exp:', z: 2 },
  application_id: { selected: true, x: 78, y: 82, w: 18, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, label: 'App ID:', z: 2 },
}

const FIELD_LABELS: Record<string, string> = {
  player_number: 'Player Number',
  player_photo: 'Player Photo',
  name: 'Player Name',
  category: 'Category',
  base_price: 'Base Price',
  role: 'Role',
  location: 'Location',
  batting: 'Batting Style',
  bowling: 'Bowling Style',
  mobile: 'Mobile Number',
  age: 'Age',
  experience: 'Experience',
  application_id: 'Application Name & ID',
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '')
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

export default function PdfDesignStudio({ auctionId }: PdfDesignStudioProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('page_grid')
  const [activeTab, setActiveTab] = useState<'category' | 'auction'>('category')
  const [cols, setCols] = useState<number>(3)
  const [rows, setRows] = useState<number>(3)
  const [cardFill, setCardFill] = useState<string>('#ffffff')
  const [cardFillOpacity, setCardFillOpacity] = useState<number>(95)
  const [elementBoxOpacity, setElementBoxOpacity] = useState<number>(0)
  const [elementBoxBgColor, setElementBoxBgColor] = useState<string>('#ffffff')
  const [syncAllBoxesOpacity, setSyncAllBoxesOpacity] = useState<boolean>(true)
  const [accentColour, setAccentColour] = useState<string>('#2563eb')
  const [elements, setElements] = useState<Record<string, CardElement>>(DEFAULT_CARD_ELEMENTS)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // Sub-Designer States
  const [liveTeams, setLiveTeams] = useState<any[]>([])
  const [tournamentInfo, setTournamentInfo] = useState<any>(null)
  const [coverPageConfig, setCoverPageConfig] = useState<CoverPageConfig>(DEFAULT_COVER_CONFIG)
  const [teamsDesignerConfig, setTeamsDesignerConfig] = useState<TeamsDesignerConfig>(DEFAULT_TEAMS_CONFIG)
  const [ownersDesignerConfig, setOwnersDesignerConfig] = useState<OwnersDesignerConfig>(DEFAULT_OWNERS_CONFIG)

  // Dynamic Real Players & Categories
  const [realPlayers, setRealPlayers] = useState<any[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [draggingListKey, setDraggingListKey] = useState<string | null>(null)
  const [dragOverListKey, setDragOverListKey] = useState<string | null>(null)

  // Adjustable Header & Footer state
  const [headerConfig, setHeaderConfig] = useState<PdfHeaderConfig>(DEFAULT_HEADER_CONFIG)
  const [footerConfig, setFooterConfig] = useState<PdfFooterConfig>(DEFAULT_FOOTER_CONFIG)

  // Header & Branding states
  const [showTournamentName, setShowTournamentName] = useState(true)
  const [showTournamentLogo, setShowTournamentLogo] = useState(true)
  const [logoCount, setLogoCount] = useState<number>(1)
  const [logoAlignment, setLogoAlignment] = useState<'left' | 'center' | 'right'>('left')
  const [titleMode, setTitleMode] = useState<'Text' | 'Image'>('Text')
  const [showFieldLabelsByDefault, setShowFieldLabelsByDefault] = useState<'Yes' | 'No'>('Yes')
  const [titleX, setTitleX] = useState<number>(22)
  const [titleY, setTitleY] = useState<number>(2)
  const [titleWidth, setTitleWidth] = useState<number>(56)
  const [titleImageName, setTitleImageName] = useState<string>('')
  const [sponsorLogoFiles, setSponsorLogoFiles] = useState<string[]>([])
  const [cardBackgroundImage, setCardBackgroundImage] = useState<string>('')

  // Configurable Sheet Background Image & Opacity
  const [pageBackgroundImage, setPageBackgroundImage] = useState<string>('')
  const [pageBackgroundName, setPageBackgroundName] = useState<string>('')
  const [pageBackgroundOpacity, setPageBackgroundOpacity] = useState<number>(20)

  // Multiple Configurable Draggable Logos
  const [placedLogos, setPlacedLogos] = useState<PlacedLogo[]>([])
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null)
  const [draggingLogoId, setDraggingLogoId] = useState<string | null>(null)

  // Element Drag & Resize Engine inside Template Card
  const [draggingElementKey, setDraggingElementKey] = useState<string | null>(null)
  const [resizingElementKey, setResizingElementKey] = useState<string | null>(null)
  const elemDragStartRef = useRef<{
    startMouseX: number
    startMouseY: number
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)

  const templateCardRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const logoDragStartRef = useRef<{ startMouseX: number; startMouseY: number; startLogoX: number; startLogoY: number } | null>(null)

  // UI state
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const apiBase = apiClient.defaults.baseURL || window.location.origin

  // Handle Logo Dragging
  const handleLogoMouseDown = (e: React.MouseEvent, logo: PlacedLogo) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedLogoId(logo.id)
    setDraggingLogoId(logo.id)
    logoDragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startLogoX: logo.x,
      startLogoY: logo.y,
    }
  }

  // Handle Element Dragging inside Template Card
  const handleElementMouseDown = (e: React.MouseEvent, key: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedKey(key)
    setDraggingElementKey(key)

    const el = elements[key]
    elemDragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: el.x,
      startY: el.y,
      startW: el.w,
      startH: el.h,
    }
  }

  // Handle Element Resizing inside Template Card
  const handleElementResizeMouseDown = (e: React.MouseEvent, key: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedKey(key)
    setResizingElementKey(key)

    const el = elements[key]
    elemDragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: el.x,
      startY: el.y,
      startW: el.w,
      startH: el.h,
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Handle Logo Drag
      if (draggingLogoId && logoDragStartRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          const deltaX = e.clientX - logoDragStartRef.current.startMouseX
          const deltaY = e.clientY - logoDragStartRef.current.startMouseY
          const deltaXPct = (deltaX / rect.width) * 100
          const deltaYPct = (deltaY / rect.height) * 100

          setPlacedLogos((prev) =>
            prev.map((l) => {
              if (l.id !== draggingLogoId) return l
              const newX = Math.max(0, Math.min(100 - l.width, logoDragStartRef.current!.startLogoX + deltaXPct))
              const newY = Math.max(0, Math.min(95, logoDragStartRef.current!.startLogoY + deltaYPct))
              return {
                ...l,
                x: Math.round(newX * 10) / 10,
                y: Math.round(newY * 10) / 10,
              }
            })
          )
        }
      }

      // 2. Handle Box Element Drag inside Template Card
      if (draggingElementKey && elemDragStartRef.current && templateCardRef.current) {
        const cardRect = templateCardRef.current.getBoundingClientRect()
        if (cardRect.width > 0 && cardRect.height > 0) {
          const deltaX = e.clientX - elemDragStartRef.current.startMouseX
          const deltaY = e.clientY - elemDragStartRef.current.startMouseY
          const deltaXPct = (deltaX / cardRect.width) * 100
          const deltaYPct = (deltaY / cardRect.height) * 100

          const curW = elemDragStartRef.current.startW
          const curH = elemDragStartRef.current.startH
          const newX = Math.max(0, Math.min(100 - curW, elemDragStartRef.current.startX + deltaXPct))
          const newY = Math.max(0, Math.min(100 - curH, elemDragStartRef.current.startY + deltaYPct))

          setElements((prev) => {
            const current = prev[draggingElementKey]
            if (!current) return prev
            return {
              ...prev,
              [draggingElementKey]: {
                ...current,
                x: Math.round(newX * 2) / 2, // 0.5% snap
                y: Math.round(newY * 2) / 2,
              },
            }
          })
        }
      }

      // 3. Handle Box Element Resize inside Template Card
      if (resizingElementKey && elemDragStartRef.current && templateCardRef.current) {
        const cardRect = templateCardRef.current.getBoundingClientRect()
        if (cardRect.width > 0 && cardRect.height > 0) {
          const deltaX = e.clientX - elemDragStartRef.current.startMouseX
          const deltaY = e.clientY - elemDragStartRef.current.startMouseY
          const deltaXPct = (deltaX / cardRect.width) * 100
          const deltaYPct = (deltaY / cardRect.height) * 100

          const curX = elemDragStartRef.current.startX
          const curY = elemDragStartRef.current.startY
          const newW = Math.max(4, Math.min(100 - curX, elemDragStartRef.current.startW + deltaXPct))
          const newH = Math.max(3, Math.min(100 - curY, elemDragStartRef.current.startH + deltaYPct))

          setElements((prev) => {
            const current = prev[resizingElementKey]
            if (!current) return prev
            return {
              ...prev,
              [resizingElementKey]: {
                ...current,
                w: Math.round(newW * 2) / 2,
                h: Math.round(newH * 2) / 2,
              },
            }
          })
        }
      }
    }

    const handleMouseUp = () => {
      if (draggingLogoId) {
        setDraggingLogoId(null)
        logoDragStartRef.current = null
      }
      if (draggingElementKey) {
        setDraggingElementKey(null)
        elemDragStartRef.current = null
      }
      if (resizingElementKey) {
        setResizingElementKey(null)
        elemDragStartRef.current = null
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingLogoId, draggingElementKey, resizingElementKey])

  useEffect(() => {
    loadDesign()
  }, [auctionId])

  const loadDesign = async () => {
    setLoading(true)
    try {
      const [resDesign, resPlayers, resCats, resTeams, resSetup] = await Promise.allSettled([
        apiClient.get(`/v1/auction/console/${auctionId}/page_design/`),
        apiClient.get(`/v1/auction/players/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/categories/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/console/${auctionId}/teams/`),
        apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`),
      ])

      // 1. Process Real Players & Categories
      let fetchedPlayers: any[] = []
      if (resPlayers.status === 'fulfilled') {
        const rawP = resPlayers.value.data
        fetchedPlayers = Array.isArray(rawP) ? rawP : (rawP?.results || [])
      }
      setRealPlayers(fetchedPlayers)

      let dbCats: string[] = []
      if (resCats.status === 'fulfilled') {
        const rawC = resCats.value.data
        const cList = Array.isArray(rawC) ? rawC : (rawC?.results || [])
        dbCats = cList.map((c: any) => c.name || c).filter(Boolean)
      }
      const playerCats = fetchedPlayers.map((p: any) => p.category).filter(Boolean) as string[]
      const combinedCats = Array.from(new Set([...dbCats, ...playerCats]))
      setAvailableCategories(combinedCats)

      let initialCat = combinedCats[0] || 'General'
      const catWithPlayers = combinedCats.find((c) =>
        fetchedPlayers.some((p) => String(p.category || p.tier || '').trim().toLowerCase() === c.trim().toLowerCase())
      )
      if (catWithPlayers) {
        initialCat = catWithPlayers
      }
      setSelectedCategory(initialCat)

      // 2. Process Teams & Tournament Setup
      if (resTeams.status === 'fulfilled') {
        const rawT = resTeams.value.data
        const tList = Array.isArray(rawT) ? rawT : (rawT?.results || rawT?.teams || [])
        setLiveTeams(tList)
      }

      if (resSetup.status === 'fulfilled') {
        const setupData = resSetup.value.data || {}
        setTournamentInfo(setupData)
        if (setupData.auction?.name) {
          setCoverPageConfig((prev) => ({
            ...prev,
            title: prev.title === DEFAULT_COVER_CONFIG.title ? setupData.auction.name : prev.title,
          }))
        }
        if (setupData.tournament_logo) {
          setCoverPageConfig((prev) => ({
            ...prev,
            logo_url: prev.logo_url || setupData.tournament_logo,
          }))
        }
      }

      // 3. Process Saved PDF Design with full persistence
      if (resDesign.status === 'fulfilled') {
        const rawData = resDesign.value.data?.design_json || resDesign.value.data || {}
        const d = rawData.pdf_design || (rawData.elements ? rawData : null)
        if (d) {
          if (d.activeTab) setActiveTab(d.activeTab)
          if (d.cols) setCols(d.cols)
          if (d.rows) setRows(d.rows)
          if (d.element_box_opacity !== undefined) setElementBoxOpacity(Number(d.element_box_opacity))
          if (d.element_box_bg_color) setElementBoxBgColor(d.element_box_bg_color)
          if (d.card_fill_opacity !== undefined) setCardFillOpacity(d.card_fill_opacity)
          if (d.accent_colour) setAccentColour(d.accent_colour)
          if (d.card_fill) setCardFill(d.card_fill)
          if (d.elements) {
            const cleaned: Record<string, CardElement> = {}
            for (const [k, el] of Object.entries(d.elements as Record<string, CardElement>)) {
              const def = DEFAULT_CARD_ELEMENTS[k]
              const merged = { ...(def || {}), ...el }
              // Remove legacy hardcoded dummy strings if present from old default saves
              if (!merged.is_custom && merged.custom_text) {
                if (['Virat Kohli', 'Icon', '₹50,000', 'Batsman', 'Mumbai', 'RHB', 'RAF', '9876543210', '28', '5 Yrs', '104', '#1'].includes(merged.custom_text.trim())) {
                  delete merged.custom_text
                }
              }
              cleaned[k] = merged
            }
            setElements({ ...DEFAULT_CARD_ELEMENTS, ...cleaned })
          }
          if (d.header) {
            setHeaderConfig({ ...DEFAULT_HEADER_CONFIG, ...d.header })
          }
          if (d.footer) {
            setFooterConfig({ ...DEFAULT_FOOTER_CONFIG, ...d.footer })
          }
          if (d.cover_page) {
            setCoverPageConfig({ ...DEFAULT_COVER_CONFIG, ...d.cover_page })
          } else if (d.branding?.coverPage) {
            setCoverPageConfig({ ...DEFAULT_COVER_CONFIG, ...d.branding.coverPage })
          }
          if (d.teams_designer) {
            setTeamsDesignerConfig({ ...DEFAULT_TEAMS_CONFIG, ...d.teams_designer })
          }
          if (d.owners_designer) {
            setOwnersDesignerConfig({ ...DEFAULT_OWNERS_CONFIG, ...d.owners_designer })
          }

          const b = d.branding || {}
          if (typeof b.showTournamentName === 'boolean') setShowTournamentName(b.showTournamentName)
          if (typeof b.showTournamentLogo === 'boolean') setShowTournamentLogo(b.showTournamentLogo)
          if (b.logoCount) setLogoCount(b.logoCount)
          if (b.logoAlignment) setLogoAlignment(b.logoAlignment)
          if (b.titleMode) setTitleMode(b.titleMode)
          if (b.showFieldLabelsByDefault) setShowFieldLabelsByDefault(b.showFieldLabelsByDefault)
          if (b.titleX !== undefined) setTitleX(b.titleX)
          if (b.titleY !== undefined) setTitleY(b.titleY)
          if (b.titleWidth !== undefined) setTitleWidth(b.titleWidth)
          if (b.titleImageName) setTitleImageName(b.titleImageName)
          if (b.sponsorLogoFiles) setSponsorLogoFiles(b.sponsorLogoFiles)
          if (b.cardBackgroundImage) setCardBackgroundImage(b.cardBackgroundImage)
          if (b.pageBackgroundImage) setPageBackgroundImage(b.pageBackgroundImage)
          if (b.pageBackgroundName) setPageBackgroundName(b.pageBackgroundName)
          if (b.pageBackgroundOpacity !== undefined) setPageBackgroundOpacity(Number(b.pageBackgroundOpacity))
          if (b.cardFillOpacity !== undefined) setCardFillOpacity(Number(b.cardFillOpacity))

          // Load multiple placed logos
          if (Array.isArray(b.placedLogos) && b.placedLogos.length > 0) {
            setPlacedLogos(b.placedLogos)
            setSelectedLogoId(b.placedLogos[0].id)
          } else if (Array.isArray(b.logos) && b.logos.length > 0) {
            setPlacedLogos(b.logos)
            setSelectedLogoId(b.logos[0].id)
          } else if (b.customLogoUrl) {
            const initialLogo: PlacedLogo = {
              id: 'logo_1',
              url: b.customLogoUrl,
              name: b.customLogoName || 'Logo 1',
              x: Number(b.logoX ?? 4),
              y: Number(b.logoY ?? 1.5),
              width: Number(b.logoWidth ?? 10),
            }
            setPlacedLogos([initialLogo])
            setSelectedLogoId(initialLogo.id)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load PDF design or players', err)
    } finally {
      setLoading(false)
    }
  }

  const getDesignPayload = () => ({
    activeTab,
    cols,
    rows,
    card_fill: cardFill,
    card_fill_opacity: cardFillOpacity,
    element_box_opacity: elementBoxOpacity,
    element_box_bg_color: elementBoxBgColor,
    accent_colour: accentColour,
    elements,
    header: headerConfig,
    footer: footerConfig,
    cover_page: coverPageConfig,
    teams_designer: teamsDesignerConfig,
    owners_designer: ownersDesignerConfig,
    branding: {
      showTournamentName,
      showTournamentLogo,
      logoCount,
      logoAlignment,
      titleMode,
      showFieldLabelsByDefault,
      titleX,
      titleY,
      titleWidth,
      titleImageName,
      sponsorLogoFiles,
      cardBackgroundImage,
      pageBackgroundImage,
      pageBackgroundName,
      pageBackgroundOpacity,
      cardFillOpacity,
      placedLogos,
      logos: placedLogos,
      customLogoUrl: placedLogos[0]?.url || '',
      customLogoName: placedLogos[0]?.name || '',
      logoX: placedLogos[0]?.x ?? 4,
      logoY: placedLogos[0]?.y ?? 1.5,
      logoWidth: placedLogos[0]?.width ?? 10,
      coverPage: coverPageConfig,
      teamsConfig: teamsDesignerConfig,
      ownersConfig: ownersDesignerConfig,
    },
  })

  const handleMultipleLogosUpload = (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    fileArr.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newLogo: PlacedLogo = {
          id: `logo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${index}`,
          url: e.target?.result as string,
          name: file.name,
          x: Math.min(84, 4 + ((placedLogos.length + index) * 14) % 80),
          y: Math.min(90, 1.5 + Math.floor(((placedLogos.length + index) * 14) / 80) * 8),
          width: 10,
        }
        setPlacedLogos((prev) => [...prev, newLogo])
        setSelectedLogoId(newLogo.id)
      }
      reader.readAsDataURL(file)
    })
  }

  const updateSelectedLogo = (prop: 'x' | 'y' | 'width', val: number) => {
    if (!selectedLogoId) return
    setPlacedLogos((prev) =>
      prev.map((l) => (l.id === selectedLogoId ? { ...l, [prop]: val } : l))
    )
  }

  const removeLogo = (id: string) => {
    setPlacedLogos((prev) => prev.filter((l) => l.id !== id))
    if (selectedLogoId === id) {
      setSelectedLogoId(null)
    }
  }

  const selectedLogo = placedLogos.find((l) => l.id === selectedLogoId) || placedLogos[0] || null

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
      const currentJson = ((res.data?.design_json || res.data || {}) as Record<string, any>)
      const payload = getDesignPayload()
      currentJson.pdf_design = payload
      await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, {
        design_json: currentJson,
        pdf_design: payload,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save PDF design', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadCardsPdf = async () => {
    try {
      setSaving(true)
      const payload = getDesignPayload()
      // Auto-save latest design payload before download
      try {
        const resDesign = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
        const currentJson = ((resDesign.data?.design_json || resDesign.data || {}) as Record<string, any>)
        currentJson.pdf_design = payload
        await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, {
          design_json: currentJson,
          pdf_design: payload,
        })
      } catch (saveErr) {
        console.warn('Auto-save before export skipped:', saveErr)
      }

      // Download with latest design via POST
      const res = await apiClient.post(
        `/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}&pdf_format=${activeTab}`,
        { pdf_design: payload, pdf_format: activeTab },
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Player_Cards_${activeTab}_${cols}x${rows}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download cards PDF with POST, attempting GET fallback', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}&pdf_format=${activeTab}`
      window.open(downloadUrl, '_blank')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadTeamsPdf = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/export_teams_pdf/`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Auction_Teams_Report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export teams PDF', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_teams_pdf/`
      window.open(downloadUrl, '_blank')
    }
  }

  const handleDownloadCategoryPdf = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/export_category_pdf/`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Category_Wise_Players_Report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export category PDF', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_category_pdf/`
      window.open(downloadUrl, '_blank')
    }
  }

  const handleDownloadBookletPdf = async () => {
    try {
      setSaving(true)
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/export_booklet_pdf/`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Complete_Tournament_Auction_Booklet.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export booklet PDF', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_booklet_pdf/`
      window.open(downloadUrl, '_blank')
    } finally {
      setSaving(false)
    }
  }

  const toggleElementSelected = (key: string) => {
    setElements((prev) => {
      const el = prev[key]
      if (!el) return prev
      return {
        ...prev,
        [key]: {
          ...el,
          selected: !el.selected,
        },
      }
    })
  }

  const updateElementProp = (key: string, prop: keyof CardElement, val: any) => {
    setElements((prev) => {
      const el = prev[key]
      if (!el) return prev
      return {
        ...prev,
        [key]: {
          ...el,
          [prop]: val,
        },
      }
    })
  }

  const nudgeElement = (key: string, dx: number, dy: number) => {
    setElements((prev) => {
      const el = prev[key]
      if (!el) return prev
      const newX = Math.max(0, Math.min(100 - el.w, el.x + dx))
      const newY = Math.max(0, Math.min(100 - el.h, el.y + dy))
      return {
        ...prev,
        [key]: {
          ...el,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        },
      }
    })
  }

  const handleBackgroundUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setPageBackgroundImage(e.target?.result as string)
      setPageBackgroundName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const updateProp = (key: string, prop: keyof CardElement, val: any) => {
    setElements((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [prop]: val,
      },
    }))
  }

  const handleApplyBoxOpacityToAll = (opacityVal: number, bgCol?: string) => {
    const bounded = Math.max(0, Math.min(100, Math.round(opacityVal)))
    setElementBoxOpacity(bounded)
    if (bgCol) setElementBoxBgColor(bgCol)
    setElements((prev) => {
      const updated: Record<string, CardElement> = {}
      for (const [k, el] of Object.entries(prev)) {
        updated[k] = {
          ...el,
          bg_opacity: bounded,
          ...(bgCol ? { bg_colour: bgCol } : {}),
        }
      }
      return updated
    })
  }

  const updateBoxOpacity = (key: string, newOpacity: number, newBg?: string) => {
    const bounded = Math.max(0, Math.min(100, Math.round(newOpacity)))
    if (syncAllBoxesOpacity) {
      handleApplyBoxOpacityToAll(bounded, newBg)
    } else {
      updateProp(key, 'bg_opacity', bounded)
      if (newBg) updateProp(key, 'bg_colour', newBg)
    }
  }

  const handleAddCustomBox = () => {
    const newKey = `custom_${Date.now()}`
    const newBox: CardElement = {
      selected: true,
      x: 38,
      y: 76,
      w: 48,
      h: 12,
      font_size: 9.5,
      font_family: 'Helvetica',
      colour: '#0f172a',
      align: 'left',
      bold: false,
      italic: false,
      show_label: true,
      label: 'Badge:',
      custom_text: 'Custom Text',
      is_custom: true,
      z: 3,
    }
    setElements((prev) => ({
      ...prev,
      [newKey]: newBox,
    }))
    setSelectedKey(newKey)
  }

  const handleDeleteBox = (key: string) => {
    setElements((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
    const remainingKeys = Object.keys(elements).filter((k) => k !== key)
    setSelectedKey(remainingKeys[0] || 'name')
  }

  const handleResetElements = () => {
    setElements(DEFAULT_CARD_ELEMENTS)
    setSelectedKey('name')
  }

  const reorderElements = (draggedKey: string, targetKey: string) => {
    if (draggedKey === targetKey) return
    const entries = Object.entries(elements)
    const draggedIdx = entries.findIndex(([k]) => k === draggedKey)
    const targetIdx = entries.findIndex(([k]) => k === targetKey)
    if (draggedIdx === -1 || targetIdx === -1) return

    const [item] = entries.splice(draggedIdx, 1)
    entries.splice(targetIdx, 0, item)

    const newObj: Record<string, CardElement> = {}
    entries.forEach(([k, v]) => {
      newObj[k] = v
    })
    setElements(newObj)
  }

  const moveElementToTop = (key: string) => {
    const entries = Object.entries(elements)
    const idx = entries.findIndex(([k]) => k === key)
    if (idx <= 0) return
    const [item] = entries.splice(idx, 1)
    entries.unshift(item)

    const maxZ = Math.max(...Object.values(elements).map((el) => el.z || 2), 2)
    const newObj: Record<string, CardElement> = {}
    entries.forEach(([k, v]) => {
      newObj[k] = k === key ? { ...v, z: maxZ + 1 } : v
    })
    setElements(newObj)
    setSelectedKey(key)
  }

  const moveElementToBottom = (key: string) => {
    const entries = Object.entries(elements)
    const idx = entries.findIndex(([k]) => k === key)
    if (idx === -1 || idx === entries.length - 1) return
    const [item] = entries.splice(idx, 1)
    entries.push(item)

    const minZ = Math.min(...Object.values(elements).map((el) => el.z || 2), 2)
    const newObj: Record<string, CardElement> = {}
    entries.forEach(([k, v]) => {
      newObj[k] = k === key ? { ...v, z: Math.max(1, minZ - 1) } : v
    })
    setElements(newObj)
    setSelectedKey(key)
  }

  const moveElementUp = (key: string) => {
    const entries = Object.entries(elements)
    const idx = entries.findIndex(([k]) => k === key)
    if (idx <= 0) return
    const prev = entries[idx - 1]
    entries[idx - 1] = entries[idx]
    entries[idx] = prev

    const newObj: Record<string, CardElement> = {}
    entries.forEach(([k, v]) => {
      newObj[k] = v
    })
    setElements(newObj)
  }

  const moveElementDown = (key: string) => {
    const entries = Object.entries(elements)
    const idx = entries.findIndex(([k]) => k === key)
    if (idx === -1 || idx >= entries.length - 1) return
    const next = entries[idx + 1]
    entries[idx + 1] = entries[idx]
    entries[idx] = next

    const newObj: Record<string, CardElement> = {}
    entries.forEach(([k, v]) => {
      newObj[k] = v
    })
    setElements(newObj)
  }

  const snapElementToCardTop = (key: string) => {
    const maxZ = Math.max(...Object.values(elements).map((el) => el.z || 2), 2)
    setElements((prev) => {
      const cur = prev[key]
      if (!cur) return prev
      return {
        ...prev,
        [key]: {
          ...cur,
          y: 6,
          z: maxZ + 1,
        },
      }
    })
  }

  const snapElementToCardBottom = (key: string) => {
    setElements((prev) => {
      const cur = prev[key]
      if (!cur) return prev
      return {
        ...prev,
        [key]: {
          ...cur,
          y: Math.max(0, 96 - cur.h),
        },
      }
    })
  }

  const bringElementToFront = (key: string) => {
    const maxZ = Math.max(...Object.values(elements).map((el) => el.z || 2), 2)
    setElements((prev) => {
      const cur = prev[key]
      if (!cur) return prev
      return {
        ...prev,
        [key]: {
          ...cur,
          z: maxZ + 1,
        },
      }
    })
  }

  const sendElementToBack = (key: string) => {
    const minZ = Math.min(...Object.values(elements).map((el) => el.z || 2), 2)
    setElements((prev) => {
      const cur = prev[key]
      if (!cur) return prev
      return {
        ...prev,
        [key]: {
          ...cur,
          z: Math.max(1, minZ - 1),
        },
      }
    })
  }

  const selectedEl = selectedKey ? elements[selectedKey] : null
  const sampleCount = cols * rows

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
              CATEGORY WISE
            </span>
            <span className="text-xs text-slate-400 font-semibold">•</span>
            <span className="text-xs text-slate-500 font-semibold">{cols} Columns × {rows} Rows Grid</span>
          </div>
          <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2 mt-1">
            <FileText className="w-5 h-5 text-indigo-600" />
            PDF Design Studio & Sheet Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag & drop boxes directly on the master template card. Customize text, labels, coordinates, header, and footer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PDF Design Saved!
            </span>
          )}

          <Button
            onClick={handleDownloadCardsPdf}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm rounded-xl"
            title="Download printable grid of player auction cards"
          >
            <Printer className="w-3.5 h-3.5" />
            Download Cards PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadTeamsPdf}
            className="border-slate-300 text-zinc-800 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 rounded-xl"
            title="Export team-wise player roster PDF"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Export Teams PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadCategoryPdf}
            className="border-slate-300 text-zinc-800 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 rounded-xl"
            title="Export category-wise player roster PDF"
          >
            <Grid className="w-3.5 h-3.5 text-purple-600" />
            Export Category-wise PDF
          </Button>

          <Button
            onClick={handleDownloadBookletPdf}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm rounded-xl"
            title="Merge all pages and download complete tournament booklet PDF"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            Download Complete Booklet (PDF)
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm rounded-xl"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Design'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading PDF design studio...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Panels (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 0. Section Dropdown Selector */}
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-3.5 shadow-sm space-y-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Studio Designer / Feature
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase">
                  {activeSection.replace('_', ' ')}
                </span>
              </label>
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as ActiveSection)}
                className="w-full rounded-xl border border-indigo-300 bg-indigo-50/70 px-3 py-2 text-xs font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                <option value="page_grid">📐 Page & Grid</option>
                <option value="header">🔝 Adjustable Header</option>
                <option value="footer">🔚 Adjustable Footer</option>
                <option value="cover_page">📘 Main Page Designer (Cover Booklet)</option>
                <option value="teams_designer">🛡️ Teams Designer</option>
                <option value="owners_designer">👑 Owners Designer</option>
                <option value="card_elements">🎴 Card Layout & Box Elements</option>
              </select>
            </div>

            {/* 1. Page & Grid (Only visible when activeSection === 'page_grid') */}
            {activeSection === 'page_grid' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-indigo-600" />
                    Page & Grid
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                    Max 4 cols × 8 rows
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Columns</label>
                    <select
                      value={cols}
                      onChange={(e) => setCols(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-semibold focus:outline-none"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Column' : 'Columns'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Rows</label>
                    <select
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-semibold focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} Rows
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Card Box Colour</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={cardFill}
                        onChange={(e) => setCardFill(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-600">{cardFill}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Accent Colour</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColour}
                        onChange={(e) => setAccentColour(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-600">{accentColour}</span>
                    </div>
                  </div>
                </div>

                {/* Card Box Fill Opacity */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <label className="font-extrabold text-slate-800 block">Card Box Opacity</label>
                      <span className="text-[10px] text-slate-400">Applies to all player card boxes on the page</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                      {cardFillOpacity}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCardFillOpacity((prev) => Math.max(0, prev - 5))}
                      className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 transition"
                      title="Decrease card box opacity"
                    >-</button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={cardFillOpacity}
                      onChange={(e) => setCardFillOpacity(Number(e.target.value))}
                      className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCardFillOpacity((prev) => Math.min(100, prev + 5))}
                      className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 transition"
                      title="Increase card box opacity"
                    >+</button>
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-0.5">
                    {[
                      { label: '0% Clear', val: 0 },
                      { label: '25% Light', val: 25 },
                      { label: '50% Half', val: 50 },
                      { label: '75% Soft', val: 75 },
                      { label: '100% Solid', val: 100 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setCardFillOpacity(p.val)}
                        className={`text-[9px] py-1 rounded font-bold border transition ${
                          cardFillOpacity === p.val
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Adjustable Header Controls */}
            {activeSection === 'header' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PanelTop className="w-4 h-4 text-indigo-600" />
                    Adjustable Header
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={headerConfig.show}
                      onChange={(e) => setHeaderConfig((prev) => ({ ...prev, show: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Header</span>
                  </label>
                </div>

                {headerConfig.show && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Header Title</label>
                      <Input
                        value={headerConfig.title}
                        onChange={(e) => setHeaderConfig((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Category: Icon Players"
                        className="text-xs bg-white border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Right Subtitle / Notes</label>
                      <Input
                        value={headerConfig.right_text}
                        onChange={(e) => setHeaderConfig((prev) => ({ ...prev, right_text: e.target.value }))}
                        placeholder="e.g. Every category on new page"
                        className="text-xs bg-white border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span>Header Height</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={15}
                              max={250}
                              value={headerConfig.height}
                              onChange={(e) => setHeaderConfig((prev) => ({ ...prev, height: Math.max(15, Math.min(250, Number(e.target.value))) }))}
                              className="w-14 h-6 text-center rounded border border-slate-300 font-mono text-xs font-bold text-indigo-700"
                            />
                            <span className="text-slate-400 text-xs">px</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={250}
                          step={2}
                          value={headerConfig.height}
                          onChange={(e) => setHeaderConfig((prev) => ({ ...prev, height: Number(e.target.value) }))}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span>Font Size</span>
                          <span className="font-mono text-indigo-600">{headerConfig.font_size}px</span>
                        </div>
                        <input
                          type="range"
                          min={8}
                          max={24}
                          step={0.5}
                          value={headerConfig.font_size}
                          onChange={(e) => setHeaderConfig((prev) => ({ ...prev, font_size: Number(e.target.value) }))}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Background</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={headerConfig.bg_colour}
                            onChange={(e) => setHeaderConfig((prev) => ({ ...prev, bg_colour: e.target.value }))}
                            className="w-6 h-6 rounded border border-slate-200 bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-slate-600">{headerConfig.bg_colour}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Text Colour</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={headerConfig.text_colour}
                            onChange={(e) => setHeaderConfig((prev) => ({ ...prev, text_colour: e.target.value }))}
                            className="w-6 h-6 rounded border border-slate-200 bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-slate-600">{headerConfig.text_colour}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Adjustable Footer Controls */}
            {activeSection === 'footer' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PanelBottom className="w-4 h-4 text-indigo-600" />
                    Adjustable Footer
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={footerConfig.show}
                      onChange={(e) => setFooterConfig((prev) => ({ ...prev, show: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Footer</span>
                  </label>
                </div>

                {footerConfig.show && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Left Text</label>
                      <Input
                        value={footerConfig.left_text}
                        onChange={(e) => setFooterConfig((prev) => ({ ...prev, left_text: e.target.value }))}
                        placeholder="e.g. Official Auction Sheet"
                        className="text-xs bg-white border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Center Text <span className="text-slate-400 font-normal">({'{page}'} & {'{totalPages}'} supported)</span>
                      </label>
                      <Input
                        value={footerConfig.center_text}
                        onChange={(e) => setFooterConfig((prev) => ({ ...prev, center_text: e.target.value }))}
                        placeholder="e.g. Page {page} of {totalPages}"
                        className="text-xs bg-white border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Right Text</label>
                      <Input
                        value={footerConfig.right_text}
                        onChange={(e) => setFooterConfig((prev) => ({ ...prev, right_text: e.target.value }))}
                        placeholder="e.g. Turf Tournament Auction"
                        className="text-xs bg-white border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span>Footer Height</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={15}
                              max={250}
                              value={footerConfig.height}
                              onChange={(e) => setFooterConfig((prev) => ({ ...prev, height: Math.max(15, Math.min(250, Number(e.target.value))) }))}
                              className="w-14 h-6 text-center rounded border border-slate-300 font-mono text-xs font-bold text-indigo-700"
                            />
                            <span className="text-slate-400 text-xs">px</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={250}
                          step={2}
                          value={footerConfig.height}
                          onChange={(e) => setFooterConfig((prev) => ({ ...prev, height: Number(e.target.value) }))}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span>Font Size</span>
                          <span className="font-mono text-indigo-600">{footerConfig.font_size}px</span>
                        </div>
                        <input
                          type="range"
                          min={7}
                          max={16}
                          step={0.5}
                          value={footerConfig.font_size}
                          onChange={(e) => setFooterConfig((prev) => ({ ...prev, font_size: Number(e.target.value) }))}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Background</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={footerConfig.bg_colour}
                            onChange={(e) => setFooterConfig((prev) => ({ ...prev, bg_colour: e.target.value }))}
                            className="w-6 h-6 rounded border border-slate-200 bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-slate-600">{footerConfig.bg_colour}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Text Colour</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={footerConfig.text_colour}
                            onChange={(e) => setFooterConfig((prev) => ({ ...prev, text_colour: e.target.value }))}
                            className="w-6 h-6 rounded border border-slate-200 bg-transparent cursor-pointer"
                          />
                          <span className="text-xs font-mono text-slate-600">{footerConfig.text_colour}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Main Page Designer (Cover Booklet Page) */}
            {activeSection === 'cover_page' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Main Cover Page Designer
                  </span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded">
                    Page 1 Booklet Cover
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tournament Title</label>
                  <Input
                    value={coverPageConfig.title}
                    onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. TURF PREMIER LEAGUE 2026"
                    className="text-xs bg-white border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Cover Subtitle / Slogan</label>
                  <Input
                    value={coverPageConfig.subtitle}
                    onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="e.g. Official Tournament Booklet & Auction Catalog"
                    className="text-xs bg-white border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Date & Venue</label>
                  <Input
                    value={coverPageConfig.date_venue}
                    onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, date_venue: e.target.value }))}
                    placeholder="e.g. Main Turf Arena • Live Auction"
                    className="text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={coverPageConfig.show_logo}
                      onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, show_logo: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Cover Logo</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={coverPageConfig.show_stats}
                      onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, show_stats: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Teams & Players</span>
                  </label>
                </div>

                {coverPageConfig.show_logo && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Custom Cover Logo</label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl cursor-pointer bg-indigo-50/30 transition">
                      <UploadCloud className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-indigo-700">
                        {coverPageConfig.logo_url ? 'Change Cover Logo' : 'Upload Cover Page Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              setCoverPageConfig((prev) => ({ ...prev, logo_url: ev.target?.result as string }))
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Background</label>
                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-white h-8">
                      <input
                        type="color"
                        value={coverPageConfig.bg_colour}
                        onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, bg_colour: e.target.value }))}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-[10px] font-mono text-slate-600">{coverPageConfig.bg_colour}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Text Color</label>
                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-white h-8">
                      <input
                        type="color"
                        value={coverPageConfig.text_colour}
                        onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, text_colour: e.target.value }))}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-[10px] font-mono text-slate-600">{coverPageConfig.text_colour}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Accent</label>
                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-white h-8">
                      <input
                        type="color"
                        value={coverPageConfig.accent_colour}
                        onChange={(e) => setCoverPageConfig((prev) => ({ ...prev, accent_colour: e.target.value }))}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-[10px] font-mono text-slate-600">{coverPageConfig.accent_colour}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Teams Designer */}
            {activeSection === 'teams_designer' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Teams Designer ({liveTeams.length} Franchises)
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 font-semibold px-2 py-0.5 rounded">
                    Squad Options
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={teamsDesignerConfig.show_purse}
                      onChange={(e) => setTeamsDesignerConfig((prev) => ({ ...prev, show_purse: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Purse in Squads</span>
                  </label>

                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={teamsDesignerConfig.show_captain}
                      onChange={(e) => setTeamsDesignerConfig((prev) => ({ ...prev, show_captain: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Captain / Owner</span>
                  </label>
                </div>

                {/* Live Teams List */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {liveTeams.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No franchise teams configured yet.
                    </div>
                  ) : (
                    liveTeams.map((tm, idx) => {
                      const tName = tm.team?.name || tm.name || `Team ${idx + 1}`
                      const tShort = tm.team?.short_name || tm.short_name || tName.slice(0, 3).toUpperCase()
                      const tColor = tm.team?.primary_color || tm.primary_color || '#3b82f6'
                      const purse = tm.remaining_budget != null ? `₹${Number(tm.remaining_budget).toLocaleString('en-IN')}` : '₹50,000'

                      return (
                        <div
                          key={tm.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                              style={{ backgroundColor: tColor }}
                            />
                            <div>
                              <span className="font-extrabold text-slate-900 block">{tName}</span>
                              <span className="text-[10px] text-slate-500 font-mono font-bold">[{tShort}]</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md block">
                              {purse}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* 6. Owners Designer */}
            {activeSection === 'owners_designer' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Owners Designer ({liveTeams.length} Franchises)
                  </span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 font-semibold px-2 py-0.5 rounded">
                    Page 2 Financials
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={ownersDesignerConfig.show_purse}
                      onChange={(e) => setOwnersDesignerConfig((prev) => ({ ...prev, show_purse: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Available Purse</span>
                  </label>

                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={ownersDesignerConfig.show_contact}
                      onChange={(e) => setOwnersDesignerConfig((prev) => ({ ...prev, show_contact: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    <span>Show Contact Number</span>
                  </label>
                </div>

                {/* Live Owners List */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {liveTeams.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No team owners registered.
                    </div>
                  ) : (
                    liveTeams.map((tm, idx) => {
                      const tName = tm.team?.name || tm.name || `Team ${idx + 1}`
                      const ownerName = tm.team?.user?.full_name || tm.team?.user?.first_name || tm.owner_name || `${tName} Owner`
                      const purse = tm.remaining_budget != null ? `₹${Number(tm.remaining_budget).toLocaleString('en-IN')}` : '₹50,000'

                      return (
                        <div
                          key={tm.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 border border-amber-300">
                              {ownerName[0]?.toUpperCase() || 'O'}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 block">{ownerName}</span>
                              <span className="text-[10px] text-slate-500 font-medium">{tName}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md block">
                              {purse}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* 7. Card Layout & Box Elements */}
            {activeSection === 'card_elements' && (
              <div className="space-y-4">
                {/* Information on Card & Custom Boxes */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-indigo-600" />
                      Card Boxes ({Object.keys(elements).length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddCustomBox}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200"
                        title="Add a custom text/stat box to cards"
                      >
                        <Plus className="w-3 h-3" /> Add Box
                      </button>
                      <button
                        type="button"
                        onClick={handleResetElements}
                        className="text-[10px] text-slate-400 hover:text-slate-600"
                        title="Reset to default card layout"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {Object.entries(elements).map(([key, el]) => {
                      const isSel = selectedKey === key
                      const isDragOver = dragOverListKey === key
                      const isBeingDragged = draggingListKey === key
                      const displayName = el.is_custom
                        ? (el.label || 'Custom Box')
                        : (FIELD_LABELS[key] || key.replace('_', ' ').toUpperCase())

                      return (
                        <div
                          key={key}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', key)
                            setDraggingListKey(key)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            if (dragOverListKey !== key) setDragOverListKey(key)
                          }}
                          onDragLeave={() => {
                            if (dragOverListKey === key) setDragOverListKey(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            const src = e.dataTransfer.getData('text/plain') || draggingListKey
                            if (src && src !== key) {
                              reorderElements(src, key)
                            }
                            setDraggingListKey(null)
                            setDragOverListKey(null)
                          }}
                          onClick={() => setSelectedKey(key)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition border ${
                            isBeingDragged
                              ? 'opacity-40 bg-indigo-100 border-indigo-400 border-dashed'
                              : isDragOver
                              ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400/40'
                              : isSel
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-xs'
                              : 'bg-slate-50/70 hover:bg-slate-100 border-transparent text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {/* Drag Handle */}
                            <div
                              className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-indigo-600 rounded"
                              title="Drag up or down to reorder box"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>

                            <label
                              className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={el.selected}
                                onChange={(e) => updateProp(key, 'selected', e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5 shrink-0"
                              />
                              <span className="truncate">{displayName}</span>
                              {el.is_custom && (
                                <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded shrink-0">
                                  Custom
                                </span>
                              )}
                            </label>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              onClick={() => moveElementToTop(key)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition"
                              title="Take box to the top"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveElementUp(key)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveElementDown(key)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveElementToBottom(key)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition"
                              title="Take box to the bottom"
                            >
                              <ChevronsDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => updateProp(key, 'show_label', !el.show_label)}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold transition ml-1 ${
                                el.show_label
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                              title="Toggle prefix label"
                            >
                              {el.show_label ? 'LBL: ON' : 'LBL: OFF'}
                            </button>
                            {el.is_custom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBox(key)}
                                className="text-rose-500 hover:text-rose-700 p-0.5"
                                title="Delete this custom box"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Box Properties */}
                {selectedKey && elements[selectedKey] && (
                  <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Move className="w-4 h-4 text-indigo-600" />
                        Configure Box: {elements[selectedKey].is_custom ? (elements[selectedKey].label || 'Custom') : (FIELD_LABELS[selectedKey] || selectedKey)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        ✕ Close
                      </button>
                    </div>

                    {/* Quick Move & Layer Action Buttons */}
                    <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2 flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" /> Quick Move:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => snapElementToCardTop(selectedKey)}
                          className="px-2 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg shadow-2xs transition flex items-center gap-1"
                        >
                          <ArrowUp className="w-3 h-3" /> Take on Top
                        </button>
                        <button
                          type="button"
                          onClick={() => snapElementToCardBottom(selectedKey)}
                          className="px-2 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg shadow-2xs transition flex items-center gap-1"
                        >
                          <ArrowDown className="w-3 h-3" /> To Bottom
                        </button>
                        <button
                          type="button"
                          onClick={() => bringElementToFront(selectedKey)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-2xs transition"
                        >
                          Front
                        </button>
                        <button
                          type="button"
                          onClick={() => sendElementToBack(selectedKey)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs transition"
                        >
                          Back
                        </button>
                      </div>
                    </div>

                    {/* Text customization: Label / Prefix and Custom / Sample Value */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          Label / Prefix
                        </label>
                        <Input
                          value={elements[selectedKey].label ?? ''}
                          onChange={(e) => updateProp(selectedKey, 'label', e.target.value)}
                          placeholder="e.g. Base Price:"
                          className="bg-white border-slate-200 text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">
                          {elements[selectedKey].is_custom ? 'Custom Text' : 'Text Override'}
                        </label>
                        <Input
                          value={elements[selectedKey].custom_text ?? ''}
                          onChange={(e) => updateProp(selectedKey, 'custom_text', e.target.value)}
                          placeholder={elements[selectedKey].is_custom ? 'Enter custom text' : 'Leave blank for dynamic player data'}
                          className="bg-white border-slate-200 text-xs h-8"
                        />
                      </div>
                    </div>

                    {/* Typography & Alignment Controls */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Font Size</label>
                        <Input
                          type="number"
                          min={6}
                          max={36}
                          value={elements[selectedKey].font_size}
                          onChange={(e) => updateProp(selectedKey, 'font_size', Number(e.target.value))}
                          className="bg-white border-slate-200 text-xs h-8 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Color</label>
                        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-white h-8">
                          <input
                            type="color"
                            value={elements[selectedKey].colour}
                            onChange={(e) => updateProp(selectedKey, 'colour', e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                          <span className="text-[10px] font-mono text-slate-600">{elements[selectedKey].colour}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Align & Weight</label>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-8">
                          <button
                            type="button"
                            onClick={() => updateProp(selectedKey, 'align', 'left')}
                            className={`flex-1 py-1 flex items-center justify-center rounded text-slate-600 ${
                              elements[selectedKey].align === 'left' ? 'bg-white shadow-xs font-bold text-indigo-600' : 'hover:bg-slate-200'
                            }`}
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProp(selectedKey, 'align', 'center')}
                            className={`flex-1 py-1 flex items-center justify-center rounded text-slate-600 ${
                              elements[selectedKey].align === 'center' ? 'bg-white shadow-xs font-bold text-indigo-600' : 'hover:bg-slate-200'
                            }`}
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProp(selectedKey, 'align', 'right')}
                            className={`flex-1 py-1 flex items-center justify-center rounded text-slate-600 ${
                              elements[selectedKey].align === 'right' ? 'bg-white shadow-xs font-bold text-indigo-600' : 'hover:bg-slate-200'
                            }`}
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateProp(selectedKey, 'bold', !elements[selectedKey].bold)}
                            className={`flex-1 py-1 flex items-center justify-center rounded text-slate-600 ${
                              elements[selectedKey].bold ? 'bg-indigo-600 text-white font-black' : 'hover:bg-slate-200'
                            }`}
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Box Opacity Appearance */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <label className="font-extrabold text-slate-800 block">All Internal Boxes Opacity</label>
                      <span className="text-[10px] text-slate-400">Applies background fill opacity to all field boxes</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                      {elementBoxOpacity}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, elementBoxOpacity - 5)
                        handleApplyBoxOpacityToAll(next, elementBoxBgColor)
                      }}
                      className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 transition"
                    >-</button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={elementBoxOpacity}
                      onChange={(e) => handleApplyBoxOpacityToAll(Number(e.target.value), elementBoxBgColor)}
                      className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(100, elementBoxOpacity + 5)
                        handleApplyBoxOpacityToAll(next, elementBoxBgColor)
                      }}
                      className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 transition"
                    >+</button>
                  </div>
                </div>

                {/* Sheet Background & Watermark */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      Sheet Background Watermark
                    </span>
                    {pageBackgroundImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setPageBackgroundImage('')
                          setPageBackgroundName('')
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer bg-slate-50/70 hover:bg-indigo-50/30 transition group">
                      <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
                      <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-700">
                        {pageBackgroundName || 'Upload Sheet Background...'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleBackgroundUpload(file)
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {pageBackgroundImage && (
                    <div className="pt-1 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                          Background Opacity
                        </label>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                          {pageBackgroundOpacity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={pageBackgroundOpacity}
                        onChange={(e) => setPageBackgroundOpacity(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                      />
                    </div>
                  )}
                </div>

                {/* Draggable Logos */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Draggable Logos ({placedLogos.length})
                    </span>
                    {placedLogos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlacedLogos([])
                          setSelectedLogoId(null)
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear All
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-xl cursor-pointer bg-indigo-50/40 hover:bg-indigo-50/70 transition group">
                      <Plus className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-indigo-700">
                        + Add Logo / Sponsor (Drag to move on sheet)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleMultipleLogosUpload(e.target.files)
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* How to customize guide */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 shadow-sm space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowHowItWorks(!showHowItWorks)}
                    className="w-full flex items-center justify-between text-xs font-bold text-indigo-950 uppercase tracking-wider text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      How to customize boxes & layout
                    </span>
                    {showHowItWorks ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                  </button>

                  {showHowItWorks && (
                    <div className="text-xs text-slate-600 space-y-2 pt-1 font-normal leading-relaxed">
                      <p>
                        <strong className="text-zinc-900 font-semibold">1. Click any element on card:</strong> Click on any element in Card #1 (TEMPLATE) to open the top floating quick-edit bar.
                      </p>
                      <p>
                        <strong className="text-zinc-900 font-semibold">2. Drag & Resize:</strong> Drag boxes to move, or drag the bottom-right corner to resize.
                      </p>
                      <p>
                        <strong className="text-zinc-900 font-semibold">3. Nudge with Arrows:</strong> Use the nudge arrow buttons in the top toolbar for pixel-perfect adjustments.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Live Page Preview (Right 7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Top Floating Quick-Editor Toolbar (Visible when an element is clicked/selected) */}
            {selectedKey && elements[selectedKey] && (
              <div className="rounded-2xl border-2 border-amber-500/60 bg-slate-900/95 p-3.5 shadow-2xl text-white space-y-3 ring-2 ring-amber-500/20 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                      <Sliders className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        Editing: {elements[selectedKey].is_custom ? (elements[selectedKey].label || 'Custom') : (FIELD_LABELS[selectedKey] || selectedKey)}
                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                          ({Math.round(elements[selectedKey].x)}%, {Math.round(elements[selectedKey].y)}%)
                        </span>
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        Drag on canvas or use controls below to customize width, height, font, colour & labels
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
                        elements[selectedKey]?.selected
                          ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                          : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                      }`}
                    >
                      {elements[selectedKey]?.selected ? (
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

                {/* Quick Controls Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 text-xs">
                  {/* 1. Width */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Width (W: %)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateElementProp(
                            selectedKey,
                            'w',
                            Math.max(4, (elements[selectedKey].w || 20) - 2)
                          )
                        }
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm"
                        title="Make narrower"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={4}
                        max={100}
                        value={Math.round(elements[selectedKey].w || 20)}
                        onChange={(e) => updateElementProp(selectedKey, 'w', Math.max(4, Math.min(100, Number(e.target.value))))}
                        className="w-14 h-7 text-center rounded bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateElementProp(
                            selectedKey,
                            'w',
                            Math.min(100, (elements[selectedKey].w || 20) + 2)
                          )
                        }
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm"
                        title="Make wider"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 2. Height */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Height (H: %)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateElementProp(
                            selectedKey,
                            'h',
                            Math.max(3, (elements[selectedKey].h || 10) - 2)
                          )
                        }
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm"
                        title="Make shorter"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={3}
                        max={100}
                        value={Math.round(elements[selectedKey].h || 10)}
                        onChange={(e) => updateElementProp(selectedKey, 'h', Math.max(3, Math.min(100, Number(e.target.value))))}
                        className="w-14 h-7 text-center rounded bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateElementProp(
                            selectedKey,
                            'h',
                            Math.min(100, (elements[selectedKey].h || 10) + 2)
                          )
                        }
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm"
                        title="Make taller"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 3. Font Size */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Font Size (px)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateElementProp(
                            selectedKey,
                            'font_size',
                            Math.max(6, (elements[selectedKey].font_size || 12) - 1)
                          )
                        }
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={6}
                        max={72}
                        value={elements[selectedKey].font_size || 12}
                        onChange={(e) => updateElementProp(selectedKey, 'font_size', Number(e.target.value))}
                        className="w-14 h-7 text-center rounded bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateElementProp(
                            selectedKey,
                            'font_size',
                            Math.min(72, (elements[selectedKey].font_size || 12) + 1)
                          )
                        }
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-black text-slate-200 flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 4. Text Colour */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Text Colour
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={elements[selectedKey].colour || '#000000'}
                        onChange={(e) => updateElementProp(selectedKey, 'colour', e.target.value)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer p-0"
                      />
                      <div className="flex items-center gap-1">
                        {['#FFFFFF', '#FFD54A', '#10B981', '#38BDF8', '#EF4444'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateElementProp(selectedKey, 'colour', c)}
                            style={{ backgroundColor: c }}
                            className="w-4 h-4 rounded-full border border-slate-900 shadow-xs hover:scale-125 transition"
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. Show Label Name */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Show Label Name
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedKey, 'show_label', true)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition ${
                          elements[selectedKey].show_label
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedKey, 'show_label', false)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition ${
                          !elements[selectedKey].show_label
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* 5b. Configurable Label Name */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Label Name
                    </label>
                    <input
                      type="text"
                      value={elements[selectedKey].custom_label ?? (CARD_ELEMENT_LABELS[selectedKey]?.label || '')}
                      onChange={(e) => updateElementProp(selectedKey, 'custom_label', e.target.value)}
                      placeholder="Custom Label"
                      className="w-28 h-7 px-2 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold text-xs shadow-inner"
                    />
                  </div>

                  {/* 5c. Configurable Content */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Custom Content
                    </label>
                    <input
                      type="text"
                      value={elements[selectedKey].custom_text || ''}
                      onChange={(e) => updateElementProp(selectedKey, 'custom_text', e.target.value)}
                      placeholder="Override text..."
                      className="w-32 h-7 px-2 rounded bg-slate-950 border border-slate-700 text-white font-bold text-xs shadow-inner"
                    />
                  </div>

                  {/* 6. Alignment */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Align
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedKey, 'align', 'left')}
                        className={`p-1.5 rounded border ${
                          elements[selectedKey].align === 'left'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title="Left"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedKey, 'align', 'center')}
                        className={`p-1.5 rounded border ${
                          elements[selectedKey].align === 'center'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title="Center"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElementProp(selectedKey, 'align', 'right')}
                        className={`p-1.5 rounded border ${
                          elements[selectedKey].align === 'right'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title="Right"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 7. Position Nudge */}
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Nudge Position (X: {Math.round(elements[selectedKey].x)}%, Y: {Math.round(elements[selectedKey].y)}%)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => nudgeElement(selectedKey, -2, 0)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold text-slate-200"
                        title="Nudge Left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeElement(selectedKey, 2, 0)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold text-slate-200"
                        title="Nudge Right"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeElement(selectedKey, 0, -2)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold text-slate-200"
                        title="Nudge Up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeElement(selectedKey, 0, 2)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold text-slate-200"
                        title="Nudge Down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cover Page Live Preview Canvas when activeSection === 'cover_page' */}
            {activeSection === 'cover_page' ? (
              <div className="bg-slate-200/70 border border-slate-300 rounded-2xl p-6 overflow-hidden flex justify-center shadow-inner">
                <div
                  className="w-full max-w-[720px] aspect-[1/1.414] rounded-xl shadow-2xl p-8 flex flex-col justify-between relative select-none border border-slate-300 overflow-hidden text-center transition-all"
                  style={{
                    backgroundColor: coverPageConfig.bg_colour,
                    color: coverPageConfig.text_colour,
                  }}
                >
                  <div className="my-auto space-y-6">
                    {coverPageConfig.show_logo && (
                      <div className="flex justify-center">
                        {coverPageConfig.logo_url ? (
                          <img
                            src={coverPageConfig.logo_url}
                            alt="Tournament Logo"
                            className="max-h-28 max-w-48 object-contain drop-shadow-md"
                          />
                        ) : (
                          <div
                            className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-xl mx-auto"
                            style={{ backgroundColor: coverPageConfig.accent_colour }}
                          >
                            🏆
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <h1
                        className="text-2xl sm:text-3xl font-black tracking-wider uppercase drop-shadow-sm"
                        style={{ color: coverPageConfig.text_colour }}
                      >
                        {coverPageConfig.title || 'TURF TOURNAMENT AUCTION'}
                      </h1>
                      <p
                        className="text-sm font-semibold tracking-wide opacity-90 max-w-md mx-auto"
                        style={{ color: coverPageConfig.accent_colour }}
                      >
                        {coverPageConfig.subtitle}
                      </p>
                    </div>

                    <div
                      className="w-24 h-1 mx-auto rounded-full"
                      style={{ backgroundColor: coverPageConfig.accent_colour }}
                    />

                    {coverPageConfig.show_stats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
                        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Franchise Teams</span>
                          <span className="text-lg font-black">{liveTeams.length || 8}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Roster Pool</span>
                          <span className="text-lg font-black">{realPlayers.length || 0}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Categories</span>
                          <span className="text-lg font-black">{availableCategories.length || 1}</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Format</span>
                          <span className="text-lg font-black">Official</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 text-xs font-semibold opacity-75">
                      {coverPageConfig.date_venue}
                    </div>
                  </div>

                  <div className="text-[10px] uppercase tracking-widest opacity-60 pt-4 border-t border-white/10">
                    Generated by TurfArena Live Auction Engine • Complete Tournament Booklet
                  </div>
                </div>
              </div>
            ) : null}

            {activeSection === 'teams_designer' && (
              <div className="bg-slate-200/70 border border-slate-300 rounded-2xl p-6 overflow-hidden flex justify-center shadow-inner">
                <div className="w-full max-w-[720px] aspect-[1/1.414] bg-white text-slate-900 rounded-xl shadow-2xl p-6 flex flex-col justify-between relative select-none border border-slate-300 overflow-hidden">
                  <div>
                    {/* Header */}
                    <div className="border-b-2 border-indigo-600 pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Shield className="w-5 h-5 text-indigo-600" />
                          {coverPageConfig.title || 'TOURNAMENT SQUADS DIRECTORY'}
                        </h2>
                        <p className="text-xs text-slate-500 font-semibold">
                          Franchise Teams Squad Breakdowns & Purse Allocations
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md">
                        {liveTeams.length} Franchises
                      </span>
                    </div>

                    {/* Team Squads Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-4">
                      {liveTeams.slice(0, 6).map((tm, tIdx) => {
                        const tName = tm.team?.name || tm.name || `Team ${tIdx + 1}`
                        const tColor = tm.team?.primary_color || tm.primary_color || '#3b82f6'
                        const purse = tm.remaining_budget != null ? `₹${Number(tm.remaining_budget).toLocaleString('en-IN')}` : '₹50,000'
                        const owner = tm.owner_name || tm.manager_name || 'Franchise Owner'
                        const soldPlayers = realPlayers.filter((p) => String(p.sold_to || p.team_id || '') === String(tm.id || ''))

                        return (
                          <div key={tm.id || tIdx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: tColor }} />
                                <span className="font-extrabold text-xs text-slate-900 truncate max-w-[130px]">{tName}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {purse}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>Owner: <strong className="text-slate-800">{owner}</strong></span>
                              <span>Squad: <strong className="text-indigo-700">{soldPlayers.length}/11</strong></span>
                            </div>
                            <div className="space-y-1 max-h-24 overflow-hidden pt-1">
                              {soldPlayers.length > 0 ? (
                                soldPlayers.slice(0, 4).map((p, pIdx) => (
                                  <div key={p.id || pIdx} className="flex items-center justify-between text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                    <span className="font-bold text-slate-800 truncate max-w-[110px]">{p.name || 'Player'}</span>
                                    <span className="font-mono text-slate-500">₹{Number(p.sold_price || p.base_price || 0).toLocaleString('en-IN')}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[9px] italic text-slate-400 py-2 text-center bg-white/70 rounded">
                                  No players signed yet (Active Pool)
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-2 flex justify-between uppercase tracking-wider font-semibold">
                    <span>Turf Premier League • Official Teams Report</span>
                    <span>Page 3+ Squads</span>
                  </div>
                </div>
              </div>
            )}

            {/* Owners Designer A4 Live Page Canvas */}
            {activeSection === 'owners_designer' && (
              <div className="bg-slate-200/70 border border-slate-300 rounded-2xl p-6 overflow-hidden flex justify-center shadow-inner">
                <div className="w-full max-w-[720px] aspect-[1/1.414] bg-white text-slate-900 rounded-xl shadow-2xl p-6 flex flex-col justify-between relative select-none border border-slate-300 overflow-hidden">
                  <div>
                    {/* Header */}
                    <div className="border-b-2 border-amber-500 pb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-500" />
                          Franchise Owners & Financial Summary
                        </h2>
                        <p className="text-xs text-slate-500 font-semibold">
                          Official Purse Allocations, Expenditures & Limits
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-md">
                        Section 02
                      </span>
                    </div>

                    {/* Financials Table */}
                    <div className="pt-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-black border-y border-slate-200">
                            <th className="py-2 px-2.5">Team</th>
                            <th className="py-2 px-2.5">Owner / Contact</th>
                            <th className="py-2 px-2.5 text-right">Starting Purse</th>
                            <th className="py-2 px-2.5 text-right">Remaining</th>
                            <th className="py-2 px-2.5 text-center">Players</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {liveTeams.map((tm, idx) => {
                            const tName = tm.team?.name || tm.name || `Team ${idx + 1}`
                            const tColor = tm.team?.primary_color || tm.primary_color || '#3b82f6'
                            const owner = tm.owner_name || tm.manager_name || 'Franchise Owner'
                            const starting = '₹1,00,000'
                            const remaining = tm.remaining_budget != null ? `₹${Number(tm.remaining_budget).toLocaleString('en-IN')}` : '₹50,000'
                            const soldCount = realPlayers.filter((p) => String(p.sold_to || p.team_id || '') === String(tm.id || '')).length

                            return (
                              <tr key={tm.id || idx} className="hover:bg-slate-50/80 transition">
                                <td className="py-2.5 px-2.5 flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: tColor }} />
                                  <span className="font-extrabold text-slate-900">{tName}</span>
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-700 font-semibold">{owner}</td>
                                <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">{starting}</td>
                                <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-700">{remaining}</td>
                                <td className="py-2.5 px-2.5 text-center font-bold text-indigo-700">{soldCount} / 11</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-2 flex justify-between uppercase tracking-wider font-semibold">
                    <span>Turf Premier League • Official Tournament Booklet</span>
                    <span>Page 2 Financials</span>
                  </div>
                </div>
              </div>
            )}

            {/* Category / Auction Format Status Bar (Hidden when on cover page, teams designer, or owners designer) */}
            {activeSection !== 'cover_page' && activeSection !== 'teams_designer' && activeSection !== 'owners_designer' && (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-zinc-900 flex items-center gap-1.5 text-xs">
                  <Grid className="w-4 h-4 text-indigo-600" />
                  Live Page Grid Preview ({cols} Cols × {rows} Rows • {sampleCount} Cards)
                </span>

                {activeTab === 'category' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700">Preview Category:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        const newCat = e.target.value
                        setSelectedCategory(newCat)
                        if (!headerConfig.title || headerConfig.title.startsWith('Category:')) {
                          setHeaderConfig((prev) => ({ ...prev, title: `Category: ${newCat}` }))
                        }
                      }}
                      className="text-xs font-bold bg-indigo-50/80 border border-indigo-300 rounded-lg px-2.5 py-1 text-indigo-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {availableCategories.length > 0 ? (
                        availableCategories.map((cat) => {
                          const count = realPlayers.filter(
                            (p) => String(p.category || p.tier || '').trim().toLowerCase() === cat.trim().toLowerCase()
                          ).length
                          return (
                            <option key={cat} value={cat}>
                              {cat} ({count} {count === 1 ? 'Player' : 'Players'})
                            </option>
                          )
                        })
                      ) : (
                        <option value="General">General (0 Players)</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    Auction Format: Showing {realPlayers.length} Roster Players in Sequential Lot Order
                  </div>
                )}
              </div>

              {activeTab === 'category' && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1 border-t border-slate-100">
                  <span>
                    Viewing category: <strong className="text-indigo-900">{selectedCategory}</strong>
                  </span>
                  <span>
                    <strong>
                      {
                        realPlayers.filter(
                          (p) => String(p.category || p.tier || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
                        ).length
                      }
                    </strong>{' '}
                    real player(s) in this category
                  </span>
                </div>
              )}
            </div>

            {/* A4 Paper Simulation Canvas */}
            <div className="bg-slate-200/70 border border-slate-300 rounded-2xl p-6 overflow-hidden flex justify-center shadow-inner">
              <div
                ref={canvasRef}
                className="w-full max-w-[720px] aspect-[1/1.414] bg-white text-slate-900 rounded-xl shadow-2xl p-4 flex flex-col relative select-none border border-slate-300 overflow-hidden"
              >
                {/* 1. Page Background Watermark Layer */}
                {pageBackgroundImage && (
                  <div
                    className="absolute inset-0 pointer-events-none z-0 bg-center bg-cover transition-opacity duration-150"
                    style={{
                      backgroundImage: `url(${pageBackgroundImage})`,
                      opacity: pageBackgroundOpacity / 100,
                    }}
                  />
                )}

                {/* 2. Multiple Draggable Placed Logos */}
                {placedLogos.map((logo) => {
                  const isSelected = selectedLogoId === logo.id || (!selectedLogoId && placedLogos[0]?.id === logo.id)
                  const isDragging = draggingLogoId === logo.id
                  return (
                    <div
                      key={logo.id}
                      onMouseDown={(e) => handleLogoMouseDown(e, logo)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLogoId(logo.id)
                      }}
                      className={`absolute z-30 cursor-grab active:cursor-grabbing select-none group p-0.5 rounded transition-all ${
                        isDragging
                          ? 'ring-2 ring-indigo-500 bg-white/40 shadow-xl scale-105'
                          : isSelected
                          ? 'ring-2 ring-indigo-400 bg-indigo-50/30 shadow-md'
                          : 'hover:ring-1 hover:ring-indigo-300 hover:bg-white/20'
                      }`}
                      style={{
                        left: `${logo.x}%`,
                        top: `${logo.y}%`,
                        width: `${logo.width}%`,
                        touchAction: 'none',
                      }}
                      title={`Drag to reposition ${logo.name} (${Math.round(logo.x)}%, ${Math.round(logo.y)}%)`}
                    >
                      <img
                        src={logo.url}
                        alt={logo.name}
                        className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                      />
                      <div className="absolute -top-5 left-0 bg-indigo-950/90 text-white text-[8px] font-mono px-1 rounded shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1 z-40">
                        <Move className="w-2.5 h-2.5" /> {logo.name}: {Math.round(logo.x)}%, {Math.round(logo.y)}%
                      </div>
                    </div>
                  )
                })}

                {/* 3. Adjustable Sheet Header Banner */}
                {headerConfig.show && (
                  <div
                    className="mb-3 px-3 rounded-lg flex items-center justify-between relative z-10 transition-all border border-slate-200/80 shadow-xs shrink-0"
                    style={{
                      height: `${headerConfig.height}px`,
                      backgroundColor: headerConfig.bg_colour,
                      color: headerConfig.text_colour,
                      borderBottom: `2.5px solid ${accentColour}`,
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {showTournamentLogo && placedLogos.length === 0 && (
                        <div
                          className="rounded flex items-center justify-center font-black text-white shrink-0"
                          style={{
                            width: `${Math.max(16, headerConfig.height * 0.7)}px`,
                            height: `${Math.max(16, headerConfig.height * 0.7)}px`,
                            fontSize: `${Math.max(8, headerConfig.font_size * 0.75)}px`,
                            backgroundColor: accentColour,
                          }}
                        >
                          T
                        </div>
                      )}
                      <span
                        className="font-extrabold uppercase tracking-wide truncate"
                        style={{ fontSize: `${headerConfig.font_size}px` }}
                      >
                        {headerConfig.title || (activeTab === 'category' ? `Category: ${selectedCategory || 'Icon Players'}` : 'Auction Format Order')}
                      </span>
                    </div>

                    <span
                      className="font-semibold opacity-85 truncate ml-2 text-right shrink-0"
                      style={{ fontSize: `${Math.max(7, headerConfig.font_size * 0.8)}px` }}
                    >
                      {headerConfig.right_text || (activeTab === 'category' ? 'Every category on new page' : 'Continuous order')}
                    </span>
                  </div>
                )}

                {/* 4. Grid of Player Cards */}
                <div
                  className="grid gap-2 flex-1 relative z-10"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: sampleCount }).map((_, cIdx) => {
                    const isTemplate = cIdx === 0
                    const categoryPlayers = realPlayers.filter(
                      (p) => String(p.category || p.tier || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
                    )
                    const displayedPlayers = activeTab === 'category' ? categoryPlayers : realPlayers
                    const p = displayedPlayers[cIdx]

                    // If not template and no player at this index, render an empty slot card:
                    if (!p && !isTemplate) {
                      return (
                        <div
                          key={cIdx}
                          className="relative rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-2 flex flex-col items-center justify-center text-center select-none"
                          style={{ borderColor: hexToRgba(accentColour, 0.3) }}
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-200/80 text-slate-500 font-black text-xs flex items-center justify-center mb-1">
                            #{cIdx + 1}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">Card Slot #{cIdx + 1}</span>
                          <span className="text-[9px] text-slate-400 font-medium">Available Slot</span>
                        </div>
                      )
                    }

                    // Dynamic values from real player
                    const pNum = p ? (p.serial_no != null ? `#${p.serial_no}` : `#${cIdx + 1}`) : `#${cIdx + 1}`
                    const pUser = p?.player
                    const pName = p
                      ? (p.player_name || p.name || pUser?.full_name || pUser?.first_name || pUser?.username || `Player #${p.serial_no || cIdx + 1}`)
                      : (displayedPlayers.length === 0 ? `(No Players in ${selectedCategory || 'Category'})` : `Player #${cIdx + 1}`)
                    const pCat = p ? (p.category || p.tier || selectedCategory || 'Category') : (selectedCategory || 'Category')
                    const pRole = p ? (p.role || p.player_skills || 'All-Rounder') : 'Role'
                    const pPrice = p ? (p.base_price != null ? `₹${Number(p.base_price).toLocaleString('en-IN')}` : '₹0') : '₹0'
                    const pLoc = p ? (p.location || '—') : '—'
                    const pBat = p ? (p.batting_style || '—') : '—'
                    const pBowl = p ? (p.bowling_style || '—') : '—'
                    const pMob = p ? (p.mobile || '—') : '—'
                    const pAge = p ? (p.age != null ? String(p.age) : '—') : '—'
                    const pExp = p ? (p.custom_data?.experience || p.experience || '—') : '—'
                    const pAppId = p ? (p.custom_data?.application_id || p.application_id || (p.id ? String(p.id).slice(0, 8) : `#${cIdx + 1}`)) : `#${cIdx + 1}`
                    const pPhoto = p ? (p.photo_url || p.photo || '') : ''

                    return (
                      <div
                        key={cIdx}
                        ref={isTemplate ? templateCardRef : undefined}
                        className="relative rounded-lg border overflow-hidden p-1 transition select-none"
                        style={{
                          backgroundColor: hexToRgba(cardFill, cardFillOpacity / 100),
                          borderColor: accentColour,
                          boxShadow: isTemplate ? '0 0 0 2px #4f46e5' : 'none',
                        }}
                      >
                        {isTemplate && (
                          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-bl z-20 pointer-events-none">
                            TEMPLATE
                          </div>
                        )}

                        {/* Top accent bar */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
                          style={{ backgroundColor: accentColour }}
                        />

                        {/* Render Card Elements */}
                        {Object.entries(elements).map(([key, el]) => {
                          if (!el.selected) return null
                          const isPhoto = key === 'player_photo'
                          const isSelectedElement = isTemplate && selectedKey === key
                          const isDraggingThis = isTemplate && draggingElementKey === key

                          // Determine displayed text
                          let valText = ''
                          if (el.custom_text) {
                            valText = el.custom_text
                          } else if (key === 'player_number') valText = pNum
                          else if (key === 'name') valText = pName
                          else if (key === 'category') valText = pCat
                          else if (key === 'role') valText = pRole
                          else if (key === 'base_price') valText = pPrice
                          else if (key === 'location') valText = pLoc
                          else if (key === 'batting') valText = pBat
                          else if (key === 'bowling') valText = pBowl
                          else if (key === 'mobile') valText = pMob
                          else if (key === 'age') valText = pAge
                          else if (key === 'experience') valText = pExp
                          else if (key === 'application_id') valText = pAppId
                          else if (p && p.custom_data && p.custom_data[key]) valText = String(p.custom_data[key])
                          else valText = el.label || ''

                          const labelText = el.show_label && el.label ? `${el.label} ` : ''
                          const displayText = isPhoto ? (el.show_label ? 'PHOTO' : '') : `${labelText}${valText}`

                          const boxOpacity = el.bg_opacity !== undefined ? el.bg_opacity : elementBoxOpacity
                          const boxBg = el.bg_colour || elementBoxBgColor || '#ffffff'

                          return (
                            <div
                              key={key}
                              onMouseDown={isTemplate ? (e) => handleElementMouseDown(e, key) : undefined}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedKey(key)
                              }}
                              className={`absolute flex items-center overflow-visible select-none transition-all ${
                                isTemplate
                                  ? 'cursor-move hover:ring-1 hover:ring-indigo-400 group'
                                  : 'cursor-default pointer-events-none'
                              } ${
                                isSelectedElement
                                  ? 'ring-2 ring-indigo-600 shadow-md z-30'
                                  : ''
                              } ${
                                isDraggingThis ? 'opacity-90 scale-[1.02]' : ''
                              } ${
                                isPhoto
                                  ? 'bg-slate-100 border border-slate-200 justify-center text-[7px] text-slate-500 font-bold'
                                  : ''
                              }`}
                              style={{
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.w}%`,
                                height: `${el.h}%`,
                                fontSize: `${Math.max(6, Math.round(el.font_size * 0.65))}px`,
                                color: el.colour,
                                fontWeight: el.bold ? 800 : 400,
                                justifyContent:
                                  el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                                zIndex: isSelectedElement ? 30 : el.z,
                                backgroundColor: isPhoto
                                  ? 'rgba(241, 245, 249, 0.95)'
                                  : boxOpacity > 0
                                  ? hexToRgba(boxBg, boxOpacity / 100)
                                  : (isSelectedElement ? 'rgba(238, 242, 255, 0.25)' : 'transparent'),
                                border: isPhoto
                                  ? '1px solid rgba(203, 213, 225, 0.8)'
                                  : boxOpacity > 0
                                  ? `1px solid ${hexToRgba(el.colour || '#64748b', Math.min(0.4, 0.15 + (boxOpacity / 100) * 0.25))}`
                                  : (isSelectedElement ? undefined : '1px solid transparent'),
                                borderRadius: boxOpacity > 0 ? '4px' : undefined,
                                padding: boxOpacity > 0 ? '0 4px' : undefined,
                                boxShadow: boxOpacity > 15 ? '0 1px 2px rgba(0,0,0,0.05)' : undefined,
                              }}
                              title={
                                isTemplate
                                  ? `Drag to move ${FIELD_LABELS[key] || key} (X: ${el.x}%, Y: ${el.y}%, W: ${el.w}%, H: ${el.h}%)`
                                  : undefined
                              }
                            >
                              {isPhoto && pPhoto ? (
                                <img
                                  src={pPhoto}
                                  alt={pName}
                                  className="w-full h-full object-cover rounded pointer-events-none"
                                />
                              ) : (
                                <span className="truncate w-full pointer-events-none" style={{ textAlign: el.align }}>
                                  {displayText}
                                </span>
                              )}

                              {/* Active selection badge with coordinates, top/bottom move & opacity control */}
                              {isSelectedElement && (
                                <>
                                  <div
                                    className="absolute -top-7 left-0 bg-indigo-950/95 text-white text-[8px] font-mono px-2 py-0.5 rounded-md shadow-xl whitespace-nowrap z-50 flex items-center gap-1 pointer-events-auto border border-indigo-400/50 backdrop-blur-xs select-none"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <span className="flex items-center gap-0.5 text-indigo-200">
                                      <Move className="w-2.5 h-2.5" />
                                      {Math.round(el.x)}%, {Math.round(el.y)}%
                                    </span>
                                    <span className="text-indigo-400/60">|</span>
                                    {/* Snap to Top / Bottom */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        snapElementToCardTop(key)
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 active:scale-95 text-[8px] font-bold text-white transition flex items-center gap-0.5 border border-indigo-500/60"
                                      title="Take box to top of card (Y: 6%)"
                                    >
                                      🔝 Top
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        snapElementToCardBottom(key)
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 active:scale-95 text-[8px] font-bold text-white transition flex items-center gap-0.5 border border-indigo-500/60"
                                      title="Take box to bottom of card"
                                    >
                                      ⬇ Bottom
                                    </button>
                                    <span className="text-indigo-400/60">|</span>
                                    <span className="font-sans font-bold text-slate-200">Opacity:</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        updateBoxOpacity(key, boxOpacity - 5)
                                      }}
                                      className="w-4 h-4 rounded bg-indigo-800 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center font-bold text-[10px] transition border border-indigo-600/50"
                                      title="Decrease box opacity (-5%)"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold text-amber-300 min-w-[24px] text-center">
                                      {boxOpacity}%
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        updateBoxOpacity(key, boxOpacity + 5)
                                      }}
                                      className="w-4 h-4 rounded bg-indigo-800 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center font-bold text-[10px] transition border border-indigo-600/50"
                                      title="Increase box opacity (+5%)"
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleApplyBoxOpacityToAll(boxOpacity, boxBg)
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-500 text-[8px] font-sans font-bold px-1.5 py-0.5 rounded text-white shadow-2xs hover:scale-105 active:scale-95 transition ml-0.5"
                                      title="Apply this box's opacity to ALL boxes across every card"
                                    >
                                      All
                                    </button>
                                  </div>

                                  {/* Resize Handle (Bottom-Right) */}
                                  <div
                                    onMouseDown={(e) => handleElementResizeMouseDown(e, key)}
                                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-indigo-600 hover:bg-indigo-800 rounded-xs cursor-se-resize shadow-md hover:scale-125 transition-transform z-40"
                                    title="Drag corner to resize box width and height"
                                  />
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* 5. Adjustable Sheet Footer Banner */}
                {footerConfig.show && (
                  <div
                    className="mt-3 px-3 rounded-lg flex items-center justify-between relative z-10 transition-all border border-slate-200/80 shadow-xs shrink-0 font-medium"
                    style={{
                      height: `${footerConfig.height}px`,
                      backgroundColor: footerConfig.bg_colour,
                      color: footerConfig.text_colour,
                      borderTop: `1.5px solid ${accentColour}`,
                      fontSize: `${footerConfig.font_size}px`,
                    }}
                  >
                    <span className="truncate flex-1 text-left">
                      {footerConfig.left_text}
                    </span>
                    <span className="truncate font-semibold px-2 text-center">
                      {(footerConfig.center_text || '').replace('{page}', '1').replace('{totalPages}', '1')}
                    </span>
                    <span className="truncate flex-1 text-right">
                      {footerConfig.right_text}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    )}
    </div>
  )
}
