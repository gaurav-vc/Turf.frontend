import { useState, useEffect } from 'react'
import { Printer, Download, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

interface AllTeamsRosterSheetProps {
  auctionId: string
}

export default function AllTeamsRosterSheet({ auctionId }: AllTeamsRosterSheetProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [auctionId])

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/all_teams_report/`)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load all teams report', err)
    } finally {
      setLoading(false)
    }
  }

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/export_teams_pdf/`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${data?.auction_name || 'Auction'}_Squad_Report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('PDF download error, launching print dialog instead', err)
      window.print()
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleExportCSV = () => {
    if (!data || !data.teams) return
    const rows = [
      ['Team', 'Player No', 'Player Name', 'Category', 'Role', 'Purchase Price'],
    ]
    data.teams.forEach((t: any) => {
      if (t.players && t.players.length > 0) {
        t.players.forEach((p: any) => {
          rows.push([
            t.team_name,
            p.serial_no || '',
            p.name,
            p.category || '',
            p.role || '',
            p.sold_price || 0,
          ])
        })
      } else {
        rows.push([t.team_name, '-', 'No players bought', '-', '-', '0'])
      }
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((x) => `"${x}"`).join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${data.auction_name || 'Auction'}_Teams_Roster.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Top action bar - Hidden during print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            All Teams' Squad & Purchase Order
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time financial status and complete purchased player roster for all franchise teams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            Export CSV
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
            variant="outline"
            className="border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40 text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingPdf ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Sheet
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Generating teams roster report...</div>
      ) : !data || !data.teams || data.teams.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
          No teams found for this tournament auction.
        </div>
      ) : (
        <div className="space-y-6 print:space-y-4 print:text-black">
          {/* Header visible only on print */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
            <h1 className="text-2xl font-black uppercase tracking-wider">{data.auction_name}</h1>
            <p className="text-sm font-semibold text-slate-600">Official Tournament Squad & Auction Report</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {data.teams.map((tm: any, idx: number) => {
              const fin = tm.financials || {}
              return (
                <div
                  key={tm.team_id || idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg print:border-slate-400 print:bg-white print:text-black print:break-inside-avoid print:shadow-none"
                >
                  {/* Team Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 print:border-slate-300">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-md print:text-black print:border"
                        style={{ backgroundColor: tm.color || '#3b82f6' }}
                      >
                        {tm.short_name || 'TM'}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white print:text-black flex items-center gap-2">
                          {tm.team_name}
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 print:bg-slate-200 print:text-slate-800 font-mono">
                            {tm.player_count} Players
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                          Squad limit: {fin.squad_size || 0} / {fin.max_squad || 11} players
                        </p>
                      </div>
                    </div>

                    {/* Financial Pills */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="bg-slate-950/80 print:bg-slate-100 border border-slate-800 print:border-slate-300 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-400 print:text-slate-600 block text-[10px] uppercase font-semibold">
                          Total Spent
                        </span>
                        <span className="font-bold text-white print:text-black font-mono">
                          ₹{Number(fin.total_spent || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="bg-slate-950/80 print:bg-slate-100 border border-slate-800 print:border-slate-300 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-400 print:text-slate-600 block text-[10px] uppercase font-semibold">
                          Balance Purse
                        </span>
                        <span className="font-bold text-emerald-400 print:text-emerald-700 font-mono">
                          ₹{Number(fin.purse_remaining || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="bg-slate-950/80 print:bg-slate-100 border border-slate-800 print:border-slate-300 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-400 print:text-slate-600 block text-[10px] uppercase font-semibold">
                          Authoritative Max Bid
                        </span>
                        <span className="font-bold text-amber-400 print:text-amber-800 font-mono">
                          ₹{Number(fin.max_bid || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Player Table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 print:border-slate-300 text-slate-400 print:text-slate-700 uppercase font-semibold text-[10px]">
                          <th className="py-2 px-3 w-16">No.</th>
                          <th className="py-2 px-3">Player Name</th>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-right">Sold Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 print:divide-slate-200">
                        {tm.players && tm.players.length > 0 ? (
                          tm.players.map((p: any, pIdx: number) => (
                            <tr
                              key={p.id || pIdx}
                              className="hover:bg-slate-800/20 print:hover:bg-transparent text-slate-200 print:text-slate-900"
                            >
                              <td className="py-2 px-3 font-mono text-slate-400 print:text-slate-600">
                                {p.serial_no ? `#${p.serial_no}` : `—`}
                              </td>
                              <td className="py-2 px-3 font-semibold text-white print:text-black">
                                {p.name}
                              </td>
                              <td className="py-2 px-3 text-slate-300 print:text-slate-700">
                                {p.role || 'Player'}
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 print:bg-slate-200 text-[10px] font-medium text-slate-300 print:text-slate-800">
                                  {p.category || 'General'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-bold font-mono text-emerald-400 print:text-black">
                                ₹{Number(p.sold_price || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 text-center text-slate-500 italic print:text-slate-500"
                            >
                              No players purchased yet by this franchise.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
