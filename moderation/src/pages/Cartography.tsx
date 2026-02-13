import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projetsService } from '@/services/projets'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  MapPin,
  Briefcase,
  Users,
  RefreshCw,
  Filter,
  ChevronRight,
  AlertTriangle,
  MapPinOff,
} from 'lucide-react'
import type { Projet } from '@/types'

// --- Labels & colors ---

const categorieLabels: Record<string, string> = {
  tech: 'Technologie',
  food: 'Alimentation',
  sante: 'Santé',
  education: 'Éducation',
  energie: 'Énergie',
  culture: 'Culture',
  environnement: 'Environnement',
  autre: 'Autre',
}

const maturiteLabels: Record<string, string> = {
  idee: 'Idée',
  prototype: 'Prototype',
  lancement: 'Lancement',
  croissance: 'Croissance',
}

const maturiteVariant: Record<string, string> = {
  idee: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  prototype: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  lancement: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  croissance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

// Helper to safely read localisation from a projet (field may not be typed)
function getVille(projet: Projet): string | null {
  const loc = (projet as unknown as Record<string, unknown>).localisation as
    | { ville?: string }
    | undefined
  return loc?.ville || null
}

// --- Component ---

export function CartographyPage() {
  const [selectedCategorie, setSelectedCategorie] = useState<string>('')

  // Fetch all projects (high limit to retrieve them all)
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cartography-projets'],
    queryFn: () => projetsService.getProjets({ limit: 100 }),
  })

  const projets = data?.items ?? []

  // Apply category filter
  const filtered = useMemo(() => {
    if (!selectedCategorie) return projets
    return projets.filter((p) => p.categorie === selectedCategorie)
  }, [projets, selectedCategorie])

  // Group by ville
  const grouped = useMemo(() => {
    const map = new Map<string, Projet[]>()
    for (const p of filtered) {
      const ville = getVille(p) || 'Sans localisation'
      const list = map.get(ville) ?? []
      list.push(p)
      map.set(ville, list)
    }
    // Sort: named cities first (alphabetically), "Sans localisation" last
    const sorted = [...map.entries()].sort(([a], [b]) => {
      if (a === 'Sans localisation') return 1
      if (b === 'Sans localisation') return -1
      return a.localeCompare(b, 'fr')
    })
    return sorted
  }, [filtered])

  // Stats
  const totalProjets = projets.length
  const withLocation = projets.filter((p) => getVille(p)).length
  const withoutLocation = totalProjets - withLocation

  return (
    <PageTransition>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Cartographie
            </h1>
            <p className="text-muted-foreground">
              Visualisation geographique des projets
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total projets</p>
                <p className="text-2xl font-bold">{totalProjets}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <MapPin className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avec localisation</p>
                <p className="text-2xl font-bold">{withLocation}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <MapPinOff className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sans localisation</p>
                <p className="text-2xl font-bold">{withoutLocation}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter bar */}
        <Card className="mb-6">
          <CardContent className="flex items-center gap-4 p-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="w-64">
              <Select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
              >
                <option value="">Toutes les categories</option>
                {Object.entries(categorieLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            {selectedCategorie && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategorie('')}
              >
                Effacer le filtre
              </Button>
            )}
            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} projet(s) affiche(s)
            </span>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Erreur lors du chargement des projets</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Reessayer
            </Button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <MapPin className="h-8 w-8 mb-2" />
            <p>Aucun projet trouve</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([ville, villeProjets]) => (
              <div key={ville}>
                {/* City header */}
                <div className="mb-4 flex items-center gap-2">
                  {ville === 'Sans localisation' ? (
                    <MapPinOff className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <MapPin className="h-5 w-5 text-primary" />
                  )}
                  <h2 className="text-lg font-semibold">{ville}</h2>
                  <Badge variant="secondary" className="ml-1">
                    {villeProjets.length} projet{villeProjets.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Project cards grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {villeProjets.map((projet) => (
                    <Card
                      key={projet._id}
                      className="group transition-colors hover:border-primary/40"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-start justify-between gap-2 text-sm">
                          <Link
                            to={`/projets/${projet._id}`}
                            className="font-semibold hover:underline line-clamp-2"
                          >
                            {projet.nom}
                          </Link>
                          {projet.isHidden && (
                            <Badge variant="destructive" className="shrink-0 text-[10px]">
                              Masque
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[11px]">
                            {categorieLabels[projet.categorie] || projet.categorie}
                          </Badge>
                          <span
                            className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-[11px] font-semibold ${
                              maturiteVariant[projet.maturite] ?? 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            {maturiteLabels[projet.maturite] || projet.maturite}
                          </span>
                        </div>

                        {/* Porteur */}
                        <div className="flex items-center gap-2 text-sm">
                          {projet.porteur.avatar ? (
                            <img
                              src={projet.porteur.avatar}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium">
                              {projet.porteur.prenom?.[0]}
                              {projet.porteur.nom?.[0]}
                            </div>
                          )}
                          <Link
                            to={`/users/${projet.porteur._id}`}
                            className="truncate text-muted-foreground hover:underline"
                          >
                            {projet.porteur.prenom} {projet.porteur.nom}
                          </Link>
                        </div>

                        {/* Location */}
                        {getVille(projet) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {getVille(projet)}
                          </div>
                        )}

                        {/* Bottom row: followers + link */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {projet.followersCount ?? 0} follower{(projet.followersCount ?? 0) !== 1 ? 's' : ''}
                          </span>
                          <Link to={`/projets/${projet._id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                            >
                              Voir
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default CartographyPage
