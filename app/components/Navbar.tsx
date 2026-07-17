'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Shared handler — used for the initial load AND every auth change,
    // so the logic lives in exactly one place.
    const applySession = async (session: any) => {
      if (!session) {
        setUser(null)
        setAdmin(false)
        setNickname('')
        setAvatarUrl('')
        setLoading(false)
        localStorage.removeItem('hr_user')
        localStorage.removeItem('hr_admin')
        return
      }

      setUser(session.user)
      setLoading(false)

      // If a different user was cached (account switch), purge their cache
      const cachedUserRaw = localStorage.getItem('hr_user')
      const cachedUserId = cachedUserRaw ? JSON.parse(cachedUserRaw)?.id : null
      if (cachedUserId && cachedUserId !== session.user.id) {
        localStorage.removeItem('hr_user')
        localStorage.removeItem('hr_admin')
        localStorage.removeItem(`hr_admin_${cachedUserId}`)
      }
      localStorage.setItem('hr_user', JSON.stringify(session.user))

      const cached = localStorage.getItem(`hr_admin_${session.user.id}`)
      if (cached !== null) {
        setAdmin(cached === 'true')
        setNickname(localStorage.getItem(`hr_nickname_${session.user.id}`) || '')
        setAvatarUrl(localStorage.getItem(`hr_avatar_${session.user.id}`) || '')
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin, nickname, username, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle()
        const isAdminVal = data?.is_admin === true
        const nick = data?.nickname || data?.username || ''
        const avatar = data?.avatar_url || ''
        setAdmin(isAdminVal)
        setNickname(nick)
        setAvatarUrl(avatar)
        localStorage.setItem(`hr_admin_${session.user.id}`, String(isAdminVal))
        localStorage.setItem('hr_admin', String(isAdminVal))
        localStorage.setItem(`hr_nickname_${session.user.id}`, nick)
        localStorage.setItem(`hr_avatar_${session.user.id}`, avatar)
      }
    }

    // Instant paint from cache while the real session loads
    const cachedUser = localStorage.getItem('hr_user')
    if (cachedUser) {
      const parsedUser = JSON.parse(cachedUser)
      setUser(parsedUser)
      setAdmin(localStorage.getItem('hr_admin') === 'true')
      setNickname(localStorage.getItem(`hr_nickname_${parsedUser.id}`) || '')
      setAvatarUrl(localStorage.getItem(`hr_avatar_${parsedUser.id}`) || '')
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => { applySession(session) }
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown on outside click, both menus on Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setMobileOpen(false) }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  // Close menus whenever the route actually changes
  useEffect(() => {
    setMobileOpen(false)
    setOpen(false)
  }, [pathname])

  // Lock page scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (nickname || user?.email || '?').charAt(0).toUpperCase()

  const getAvatarSrc = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL}/heavenlyriver/${url}`
  }

  return (
    <>
      <style>{`
        @keyframes navIn {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoBreathe {
          0%, 100% { text-shadow: 0 0 20px rgba(201,168,76,0.4); }
          50%      { text-shadow: 0 0 32px rgba(240,201,106,0.65); }
        }
        @keyframes menuItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 0 48px; height: 70px;
          display: flex; align-items: center; justify-content: space-between;
          transition: background 0.4s, box-shadow 0.4s;
          width: 100%; max-width: 100vw;
          animation: navIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .nav.scrolled {
          background: rgba(10,8,18,0.95);
          backdrop-filter: blur(16px);
          box-shadow: 0 1px 0 rgba(201,168,76,0.1), 0 4px 32px rgba(0,0,0,0.6);
        }
        .nav:not(.scrolled) {
          background: linear-gradient(to bottom, rgba(10,8,18,0.9), transparent);
        }

        .nav-logo {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0;
        }
        .nav-logo-text {
          font-family: 'Cinzel', serif; font-size: 18px;
          color: #f0c96a; letter-spacing: 3px;
          white-space: nowrap;
          animation: logoBreathe 5s ease-in-out infinite;
          transition: letter-spacing 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .nav-logo:hover .nav-logo-text { letter-spacing: 4px; }

        .nav-center {
          position: absolute; left: 50%; transform: translateX(-50%);
          display: flex; gap: 4px; align-items: center;
        }
        .nav-link {
          color: rgba(240,230,211,0.6); text-decoration: none;
          font-size: 12px; font-weight: 600; letter-spacing: 1.5px;
          text-transform: uppercase; padding: 6px 14px; border-radius: 3px;
          transition: all 0.2s; font-family: 'Nunito', sans-serif;
          position: relative; white-space: nowrap;
        }
        .nav-link::after {
          content: ''; position: absolute; bottom: 0;
          left: 50%; right: 50%; height: 1px;
          background: linear-gradient(90deg, transparent, #c9a84c, transparent);
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .nav-link:hover { color: #f0e6d3; }
        .nav-link:hover::after { left: 8px; right: 8px; }
        .nav-link.active { color: #f0c96a; }
        .nav-link.active::after { left: 14px; right: 14px; }

        .nav-right { display: flex; gap: 10px; align-items: center; flex-shrink: 0; }
        .nav-upload-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.25); border-radius: 3px;
          color: #c9a84c; font-size: 11px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          text-decoration: none; transition: all 0.25s;
          font-family: 'Nunito', sans-serif; white-space: nowrap;
        }
        .nav-upload-btn:hover {
          background: rgba(201,168,76,0.18); border-color: #c9a84c;
          box-shadow: 0 0 14px rgba(201,168,76,0.25);
          transform: translateY(-1px);
        }
        .nav-signin-btn {
          padding: 7px 18px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          border: 1px solid rgba(201,168,76,0.3); border-radius: 3px;
          color: #f0c96a; font-size: 11px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          text-decoration: none; transition: all 0.25s;
          font-family: 'Nunito', sans-serif; white-space: nowrap;
        }
        .nav-signin-btn:hover {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          box-shadow: 0 0 16px rgba(192,57,43,0.35);
          transform: translateY(-1px);
        }

        .avatar {
          width: 36px; height: 36px; border-radius: 4px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; font-size: 15px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; border: 1px solid rgba(201,168,76,0.25);
          transition: all 0.25s; font-family: 'Cinzel', serif; overflow: hidden;
          flex-shrink: 0;
        }
        .avatar:hover {
          border-color: #c9a84c;
          box-shadow: 0 0 16px rgba(201,168,76,0.25);
          transform: scale(1.06);
        }
        .avatar:active { transform: scale(0.96); }
        .avatar-skeleton {
          width: 36px; height: 36px; border-radius: 4px;
          background: linear-gradient(90deg, #16121f 25%, #1e1828 45%, rgba(201,168,76,0.08) 50%, #1e1828 55%, #16121f 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
          flex-shrink: 0;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .dropdown-wrap { position: relative; }
        .dropdown {
          position: absolute; top: calc(100% + 14px); right: 0;
          background: #0f0c18; border: 1px solid rgba(201,168,76,0.2);
          border-radius: 8px; min-width: 210px; overflow: hidden;
          box-shadow: 0 16px 48px rgba(0,0,0,0.9), 0 0 24px rgba(201,168,76,0.06);
          animation: dropIn 0.22s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes dropIn { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .dropdown-arrow {
          position: absolute; top: -6px; right: 14px;
          width: 11px; height: 11px; background: #0f0c18;
          border-left: 1px solid rgba(201,168,76,0.2);
          border-top: 1px solid rgba(201,168,76,0.2);
          transform: rotate(45deg);
        }
        .dropdown-header { padding: 14px 16px; border-bottom: 1px solid rgba(201,168,76,0.1); }
        .dropdown-avatar-row { display: flex; align-items: center; gap: 10px; }
        .dropdown-avatar-big {
          width: 40px; height: 40px; border-radius: 5px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; font-size: 18px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif; flex-shrink: 0;
          border: 1px solid rgba(201,168,76,0.2); overflow: hidden;
        }
        .dropdown-email { font-size: 12px; color: rgba(240,230,211,0.35); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
        .dropdown-name { font-size: 13px; color: #f0e6d3; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px; color: rgba(240,230,211,0.75);
          text-decoration: none; font-size: 13px; font-weight: 600;
          transition: all 0.15s; cursor: pointer; width: 100%;
          text-align: left; background: none; border: none;
          font-family: 'Nunito', sans-serif;
        }
        .dropdown-item:hover { background: rgba(201,168,76,0.07); color: #f0e6d3; padding-left: 20px; }
        .dropdown-item-icon { font-size: 14px; width: 20px; text-align: center; }
        .dropdown-divider { height: 1px; background: rgba(201,168,76,0.1); margin: 4px 0; }
        .dropdown-item.danger { color: rgba(231,76,60,0.8); }
        .dropdown-item.danger:hover { background: rgba(192,57,43,0.1); color: #e74c3c; }

        .admin-badge {
          font-size: 9px; background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; padding: 2px 7px; border-radius: 2px;
          letter-spacing: 1px; text-transform: uppercase;
          font-family: 'Cinzel', serif; border: 1px solid rgba(201,168,76,0.3);
          white-space: nowrap;
        }

        /* Hamburger */
        .hamburger {
          display: none; flex-direction: column; gap: 5px;
          cursor: pointer; padding: 6px; background: none; border: none;
          flex-shrink: 0;
        }
        .hamburger span {
          display: block; width: 22px; height: 2px;
          background: #f0e6d3; border-radius: 2px; transition: all 0.3s;
        }
        .hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); background: #c9a84c; }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); background: #c9a84c; }

        /* Mobile menu */
        .mobile-menu {
          display: none; position: fixed; top: 70px; left: 0; right: 0;
          background: rgba(10,8,18,0.98); backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(201,168,76,0.1);
          padding: 16px; z-index: 99; flex-direction: column; gap: 2px;
          animation: slideDown 0.25s cubic-bezier(0.22, 1, 0.36, 1); max-height: calc(100vh - 70px);
          overflow-y: auto;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .mobile-menu.open { display: flex; }
        .mobile-menu.open > * { animation: menuItemIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .mobile-menu.open > *:nth-child(1) { animation-delay: 0.03s; }
        .mobile-menu.open > *:nth-child(2) { animation-delay: 0.06s; }
        .mobile-menu.open > *:nth-child(3) { animation-delay: 0.09s; }
        .mobile-menu.open > *:nth-child(4) { animation-delay: 0.12s; }
        .mobile-menu.open > *:nth-child(5) { animation-delay: 0.15s; }
        .mobile-menu.open > *:nth-child(6) { animation-delay: 0.18s; }
        .mobile-menu.open > *:nth-child(7) { animation-delay: 0.21s; }
        .mobile-menu.open > *:nth-child(n+8) { animation-delay: 0.24s; }
        .mobile-link {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 16px; color: rgba(240,230,211,0.7);
          text-decoration: none; font-size: 15px; font-weight: 600;
          border-radius: 6px; transition: all 0.2s;
          font-family: 'Nunito', sans-serif; letter-spacing: 0.5px;
        }
        .mobile-link:hover { background: rgba(201,168,76,0.08); color: #f0e6d3; }
        .mobile-link-icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; }
        .mobile-divider { height: 1px; background: rgba(201,168,76,0.1); margin: 6px 0; }
        .mobile-signout {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 16px; color: rgba(231,76,60,0.8);
          font-size: 15px; font-weight: 600; border-radius: 6px;
          transition: all 0.2s; font-family: 'Nunito', sans-serif;
          cursor: pointer; background: none; border: none; width: 100%; text-align: left;
        }
        .mobile-signout:hover { background: rgba(192,57,43,0.1); color: #e74c3c; }
        .mobile-user-info {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; margin-bottom: 4px;
          background: rgba(201,168,76,0.04); border-radius: 8px;
          border: 1px solid rgba(201,168,76,0.08);
        }
        .mobile-avatar {
          width: 44px; height: 44px; border-radius: 6px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; font-size: 20px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif; border: 1px solid rgba(201,168,76,0.2);
          flex-shrink: 0; overflow: hidden;
        }
        .mobile-user-email { font-size: 11px; color: rgba(240,230,211,0.3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
        .mobile-user-name { font-size: 15px; color: #f0e6d3; font-weight: 700; margin-bottom: 2px; }

        /* Responsive breakpoints */
        @media (max-width: 900px) {
          .nav { padding: 0 24px; }
          .nav-center { display: none; }
        }

        @media (max-width: 768px) {
          .nav { padding: 0 16px; height: 64px; }
          .nav-logo-text { font-size: 15px; letter-spacing: 2px; }
          .nav-upload-btn { display: none; }
          .hamburger { display: flex; }
          .desktop-right { display: none !important; }
          .mobile-menu { top: 64px; max-height: calc(100vh - 64px); }
        }

        @media (max-width: 380px) {
          .nav { padding: 0 12px; }
          .nav-logo-text { font-size: 13px; letter-spacing: 1px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .nav, .nav-logo-text, .dropdown, .mobile-menu, .mobile-menu.open > *, .avatar-skeleton { animation: none !important; }
          .nav-link, .nav-link::after, .avatar, .nav-upload-btn, .nav-signin-btn, .dropdown-item, .hamburger span { transition: none !important; }
        }
      `}</style>

      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <span className="nav-logo-text">HeavenlyRiver</span>
        </Link>

        {/* Desktop center links */}
        <div className="nav-center">
          <Link href="/" className={`nav-link${pathname === '/' ? ' active' : ''}`}>Home</Link>
          <Link href="/search" className={`nav-link${pathname?.startsWith('/search') ? ' active' : ''}`}>Search</Link>
          <Link href="/party" className={`nav-link${pathname?.startsWith('/party') ? ' active' : ''}`}>Parties</Link>
          <Link href="/series" className={`nav-link${pathname?.startsWith('/series') ? ' active' : ''}`}>Series</Link>
        </div>

        {/* Desktop right */}
        <div className="nav-right desktop-right" style={{ display: 'flex' }}>
          {admin && <Link href="/upload" className="nav-upload-btn">＋ Upload</Link>}
          {loading ? (
            <div className="avatar-skeleton" />
          ) : user ? (
            <div className="dropdown-wrap" ref={dropdownRef}>
              <div className="avatar" onClick={() => setOpen(!open)}>
                {avatarUrl
                  ? <img src={getAvatarSrc(avatarUrl)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials
                }
              </div>
              {open && (
                <div className="dropdown">
                  <div className="dropdown-arrow" />
                  <div className="dropdown-header">
                    <div className="dropdown-avatar-row">
                      <div className="dropdown-avatar-big">
                        {avatarUrl
                          ? <img src={getAvatarSrc(avatarUrl)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : initials
                        }
                      </div>
                      <div>
                        <div className="dropdown-name">
                          {nickname || user.email?.split('@')[0]}
                          {admin && <span className="admin-badge">Admin</span>}
                        </div>
                        <div className="dropdown-email">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <Link href="/profile" className="dropdown-item" onClick={() => setOpen(false)}>
                    <span className="dropdown-item-icon">👤</span> My Profile
                  </Link>
                  <Link href="/party" className="dropdown-item" onClick={() => setOpen(false)}>
                    <span className="dropdown-item-icon">🎉</span> Watch Parties
                  </Link>
                  <Link href="/watchlist" className="dropdown-item" onClick={() => setOpen(false)}>
                    <span className="dropdown-item-icon">🔖</span> My Watchlist
                  </Link>
                  {admin && (
                    <Link href="/upload" className="dropdown-item" onClick={() => setOpen(false)}>
                      <span className="dropdown-item-icon">⬆️</span> Upload Video
                    </Link>
                  )}
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleSignOut}>
                    <span className="dropdown-item-icon">🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="nav-signin-btn">Sign In</Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        {user && (
          <>
            <div className="mobile-user-info">
              <div className="mobile-avatar">
                {avatarUrl
                  ? <img src={getAvatarSrc(avatarUrl)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                  : initials
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                  <div className="mobile-user-name">{nickname || user.email?.split('@')[0]}</div>
                  {admin && <span className="admin-badge">Admin</span>}
                </div>
                <div className="mobile-user-email">{user.email}</div>
              </div>
            </div>
            <div className="mobile-divider" />
          </>
        )}

        <Link href="/" className="mobile-link" onClick={() => setMobileOpen(false)}>
          <span className="mobile-link-icon">🏠</span> Home
        </Link>
        <Link href="/search" className="mobile-link" onClick={() => setMobileOpen(false)}>
          <span className="mobile-link-icon">🔍</span> Search
        </Link>
        <Link href="/party" className="mobile-link" onClick={() => setMobileOpen(false)}>
          <span className="mobile-link-icon">🎉</span> Watch Parties
        </Link>
        <Link href="/watchlist" className="mobile-link" onClick={() => setMobileOpen(false)}>
          <span className="mobile-link-icon">🔖</span> My Watchlist
        </Link>
        <Link href="/series" className="mobile-link" onClick={() => setMobileOpen(false)}>
          <span className="mobile-link-icon">📺</span> Series
        </Link>

        {user ? (
          <>
            <Link href="/profile" className="mobile-link" onClick={() => setMobileOpen(false)}>
              <span className="mobile-link-icon">👤</span> My Profile
            </Link>
            {admin && (
              <Link href="/upload" className="mobile-link" onClick={() => setMobileOpen(false)}>
                <span className="mobile-link-icon">⬆️</span> Upload Video
              </Link>
            )}
            <div className="mobile-divider" />
            <button className="mobile-signout" onClick={handleSignOut}>
              <span className="mobile-link-icon">🚪</span> Sign Out
            </button>
          </>
        ) : (
          <>
            <div className="mobile-divider" />
            <Link href="/login" className="mobile-link" onClick={() => setMobileOpen(false)}>
              <span className="mobile-link-icon">🔑</span> Sign In
            </Link>
          </>
        )}
      </div>
    </>
  )
}