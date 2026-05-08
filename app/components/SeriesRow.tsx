import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { getStorageUrl } from '../lib/storage'

export default async function SeriesRow() {
  const { data: seriesList } = await supabase
    .from('series')
    .select('*, seasons(id, episodes(id))')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!seriesList || seriesList.length === 0) return null

  return (
    <>
      <style>{`
        .sr-wrap { margin-bottom: 56px; }
        .sr-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .sr-title { font-family: 'Cinzel', serif; font-size: 16px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; text-shadow: 0 0 20px rgba(201,168,76,0.25); margin: 0; }
        .sr-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.2), transparent); }
        .sr-count { font-size: 11px; color: rgba(240,230,211,0.2); font-weight: 600; letter-spacing: 1px; white-space: nowrap; }
        .sr-cards { display: flex; gap: 14px; overflow-x: auto; padding-top: 20px; padding-bottom: 20px; padding-left: 10px; padding-right: 10px; margin-left: -10px; margin-right: -10px; scrollbar-width: thin; scrollbar-color: rgba(201,168,76,0.3) transparent; }
        .sr-cards::-webkit-scrollbar { height: 3px; }
        .sr-cards::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        .sr-card { flex-shrink: 0; width: 150px; border-radius: 6px; overflow: hidden; background: #16121f; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s; position: relative; z-index: 1; }
        .sr-card:hover { transform: translateY(-6px) scale(1.03); box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.2); z-index: 10; }
        .sr-thumb { width: 150px; height: 220px; background: #1e1828; position: relative; overflow: hidden; }
        .sr-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .sr-card:hover .sr-thumb img { transform: scale(1.06); }
        .sr-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.95) 0%, rgba(10,8,18,0.2) 60%, transparent 100%); }
        .sr-thumb-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 10px; }
        .sr-thumb-title { font-family: 'Cinzel', serif; font-size: 12px; color: #f0e6d3; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sr-thumb-meta { font-size: 10px; color: rgba(240,230,211,0.35); }
        .sr-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; background: linear-gradient(135deg, #16121f, #1e1828); }
        @media (max-width: 480px) {
          .sr-card { width: 120px; }
          .sr-thumb { width: 120px; height: 176px; }
        }
      `}</style>

      <div className="sr-wrap">
        <div className="sr-header">
          <h2 className="sr-title">Series</h2>
          <div className="sr-line" />
          <Link href="/series" style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', letterSpacing: '1px', whiteSpace: 'nowrap', fontFamily: "'Cinzel', serif" }}>
            View All →
          </Link>
        </div>
        <div className="sr-cards">
          {seriesList.map((s: any) => {
            const totalEps = s.seasons?.reduce((acc: number, season: any) => acc + (season.episodes?.length || 0), 0) || 0
            const totalSeasons = s.seasons?.length || 0
            return (
              <Link key={s.id} href={`/series/${s.id}`} className="sr-card">
                <div className="sr-thumb">
                  {s.thumbnail_url
                    ? <><img src={getStorageUrl(s.thumbnail_url)} alt={s.title} /><div className="sr-thumb-overlay" /></>
                    : <div className="sr-emoji">📺</div>
                  }
                  <div className="sr-thumb-info">
                    <div className="sr-thumb-title">{s.title}</div>
                    <div className="sr-thumb-meta">
                      {totalSeasons > 0 ? `${totalSeasons}S · ${totalEps}EP` : 'No episodes'}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}