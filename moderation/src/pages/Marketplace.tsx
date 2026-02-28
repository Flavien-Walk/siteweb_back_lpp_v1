import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { marketplaceService, type OrderListParams, type ServiceListParams } from '@/services/marketplace'
import { PageTransition } from '@/components/PageTransition'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShoppingBag,
  Package,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Star,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { formatRelativeTime, formatDate } from '@/lib/utils'
import type { OrderStatut, ServiceStatut, MarketplaceStats } from '@/types'

// ============ LABELS & BADGES ============

const orderStatusLabels: Record<OrderStatut, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptee',
  refusee: 'Refusee',
  en_cours: 'En cours',
  livre: 'Livree',
  termine: 'Terminee',
  annule: 'Annulee',
  litige: 'Litige',
}

const orderStatusColors: Record<OrderStatut, string> = {
  en_attente: 'warning',
  acceptee: 'default',
  refusee: 'secondary',
  en_cours: 'default',
  livre: 'default',
  termine: 'success',
  annule: 'secondary',
  litige: 'destructive',
}

const serviceStatusLabels: Record<ServiceStatut, string> = {
  brouillon: 'Brouillon',
  actif: 'Actif',
  pause: 'En pause',
  archive: 'Archive',
}

const serviceStatusColors: Record<ServiceStatut, string> = {
  brouillon: 'secondary',
  actif: 'success',
  pause: 'warning',
  archive: 'secondary',
}

const categorieLabels: Record<string, string> = {
  service: 'Service',
  formation: 'Formation',
  produit: 'Produit',
  outil: 'Outil',
  accompagnement: 'Accompagnement',
}

function OrderStatusBadge({ statut }: { statut: OrderStatut }) {
  return (
    <Badge variant={orderStatusColors[statut] as never}>
      {orderStatusLabels[statut] || statut}
    </Badge>
  )
}

function ServiceStatusBadge({ statut }: { statut: ServiceStatut }) {
  return (
    <Badge variant={serviceStatusColors[statut] as never}>
      {serviceStatusLabels[statut] || statut}
    </Badge>
  )
}

function formatEUR(amount: number | null | undefined): string {
  if (amount == null) return 'Sur devis'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

// ============ STATS CARDS ============

function StatsCards({ stats }: { stats?: MarketplaceStats }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Package className="h-3.5 w-3.5" /> Total commandes
          </div>
          <p className="text-2xl font-bold text-zinc-100">{stats.total}</p>
        </CardContent>
      </Card>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Litiges actifs
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.litiges}</p>
        </CardContent>
      </Card>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Clock className="h-3.5 w-3.5" /> 30 derniers jours
          </div>
          <p className="text-2xl font-bold text-zinc-100">{stats.last30Days}</p>
        </CardContent>
      </Card>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> CA termine
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatEUR(stats.montantTotalTermine)}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============ SERVICES TAB ============

function ServicesTab() {
  const [page, setPage] = useState(1)
  const [statut, setStatut] = useState('')
  const [categorie, setCategorie] = useState('')
  const [search, setSearch] = useState('')
  const [selectedService, setSelectedService] = useState<string | null>(null)

  const params: ServiceListParams = { page, limit: 20 }
  if (statut) params.statut = statut
  if (categorie) params.categorie = categorie
  if (search.length >= 2) params.search = search

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-marketplace-services', params],
    queryFn: () => marketplaceService.getServices(params),
  })

  const { data: detail } = useQuery({
    queryKey: ['admin-marketplace-service', selectedService],
    queryFn: () => marketplaceService.getService(selectedService!),
    enabled: !!selectedService,
  })

  return (
    <>
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Filter className="h-3.5 w-3.5" /> Filtres
        </div>
        <Select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1) }}>
          <option value="">Tous les statuts</option>
          {Object.entries(serviceStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select value={categorie} onChange={(e) => { setCategorie(e.target.value); setPage(1) }}>
          <option value="">Toutes categories</option>
          {Object.entries(categorieLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        {data && <span className="text-xs text-zinc-500 ml-auto">{data.totalCount} service(s)</span>}
      </div>

      {/* Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Entrepreneur</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-zinc-500">Chargement...</TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-zinc-500">Aucun service trouve</TableCell>
              </TableRow>
            ) : data.items.map((s) => (
              <TableRow key={s._id} className="cursor-pointer hover:bg-zinc-800/50" onClick={() => setSelectedService(s._id)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {s.image && <img src={s.image} alt="" className="h-8 w-8 rounded object-cover" />}
                    <span className="text-sm font-medium text-zinc-200 line-clamp-1">{s.nom}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {s.createur?.avatar && <img src={s.createur.avatar} alt="" className="h-5 w-5 rounded-full" />}
                    <span className="text-xs text-zinc-300">{s.createur?.prenom} {s.createur?.nom}</span>
                  </div>
                </TableCell>
                <TableCell><span className="text-xs text-zinc-400">{categorieLabels[s.categorie] || s.categorie}</span></TableCell>
                <TableCell><span className="text-xs font-medium text-zinc-200">{formatEUR(s.prix)}</span></TableCell>
                <TableCell><ServiceStatusBadge statut={s.statut} /></TableCell>
                <TableCell>
                  {s.statsCache?.noteGlobale ? (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" /> {s.statsCache.noteGlobale.toFixed(1)}
                    </span>
                  ) : <span className="text-xs text-zinc-600">—</span>}
                </TableCell>
                <TableCell><span className="text-xs text-zinc-500">{formatRelativeTime(s.dateCreation)}</span></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-7">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-zinc-500">Page {data.currentPage} / {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.hasPrevPage} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail du service</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {detail.service.image && <img src={detail.service.image} alt="" className="h-20 w-20 rounded-lg object-cover" />}
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">{detail.service.nom}</h3>
                  <p className="text-sm text-zinc-400">{detail.service.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ServiceStatusBadge statut={detail.service.statut} />
                    <Badge variant="outline">{categorieLabels[detail.service.categorie] || detail.service.categorie}</Badge>
                    <span className="text-sm font-bold text-zinc-200">{formatEUR(detail.service.prix)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase">Entrepreneur</p>
                  <p className="text-sm text-zinc-200">{detail.service.createur?.prenom} {detail.service.createur?.nom}</p>
                  <p className="text-xs text-zinc-500">{detail.service.createur?.email}</p>
                </div>
                <div className="p-3 rounded bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase">Delai de livraison</p>
                  <p className="text-sm text-zinc-200">{detail.service.delaiLivraison}</p>
                </div>
                <div className="p-3 rounded bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase">Revisions</p>
                  <p className="text-sm text-zinc-200">
                    {detail.service.accepteRevisions ? `${detail.service.revisionsIncluses} incluse(s)` : 'Non acceptees'}
                  </p>
                </div>
                <div className="p-3 rounded bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase">Commandes</p>
                  <p className="text-sm text-zinc-200">{detail.stats.totalCommandes}</p>
                </div>
              </div>

              {detail.service.tags && detail.service.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detail.service.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              )}

              {detail.reviews.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Avis recents</p>
                  <div className="space-y-2">
                    {detail.reviews.map((r: any) => (
                      <div key={r._id} className="p-2 rounded bg-zinc-800/30 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400" /> {r.note}
                          </span>
                          <span className="text-zinc-400">{r.auteur?.prenom} {r.auteur?.nom}</span>
                          <span className="text-zinc-600 ml-auto">{formatRelativeTime(r.dateCreation)}</span>
                        </div>
                        <p className="text-zinc-300">{r.commentaire}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============ COMMANDES TAB ============

function CommandesTab() {
  const [page, setPage] = useState(1)
  const [statut, setStatut] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCommande, setSelectedCommande] = useState<string | null>(null)

  const params: OrderListParams = { page, limit: 20 }
  if (statut) params.statut = statut
  if (search.length >= 2) params.search = search

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-marketplace-commandes', params],
    queryFn: () => marketplaceService.getCommandes(params),
  })

  const { data: detail } = useQuery({
    queryKey: ['admin-marketplace-commande', selectedCommande],
    queryFn: () => marketplaceService.getCommande(selectedCommande!),
    enabled: !!selectedCommande,
  })

  return (
    <>
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Filter className="h-3.5 w-3.5" /> Filtres
        </div>
        <Select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1) }}>
          <option value="">Tous les statuts</option>
          {Object.entries(orderStatusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Rechercher service..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        {data && <span className="text-xs text-zinc-500 ml-auto">{data.totalCount} commande(s)</span>}
      </div>

      {/* Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Acheteur</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">Chargement...</TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-zinc-500">Aucune commande trouvee</TableCell>
              </TableRow>
            ) : data.items.map((c) => (
              <TableRow key={c._id} className="cursor-pointer hover:bg-zinc-800/50" onClick={() => setSelectedCommande(c._id)}>
                <TableCell>
                  <span className="text-sm text-zinc-200 line-clamp-1">{c.serviceSnapshot?.nom || c.service?.nom || '—'}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {c.acheteur?.avatar && <img src={c.acheteur.avatar} alt="" className="h-5 w-5 rounded-full" />}
                    <span className="text-xs text-zinc-300">{c.acheteur?.prenom} {c.acheteur?.nom}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {c.vendeur?.avatar && <img src={c.vendeur.avatar} alt="" className="h-5 w-5 rounded-full" />}
                    <span className="text-xs text-zinc-300">{c.vendeur?.prenom} {c.vendeur?.nom}</span>
                  </div>
                </TableCell>
                <TableCell><span className="text-xs font-medium text-zinc-200">{formatEUR(c.montantTotal)}</span></TableCell>
                <TableCell><OrderStatusBadge statut={c.statut} /></TableCell>
                <TableCell><span className="text-xs text-zinc-500">{formatRelativeTime(c.dateCreation)}</span></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-7">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-zinc-500">Page {data.currentPage} / {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.hasPrevPage} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedCommande} onOpenChange={() => setSelectedCommande(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail de la commande</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <OrderStatusBadge statut={detail.commande.statut} />
                <span className="text-lg font-semibold text-zinc-100">{detail.commande.serviceSnapshot?.nom}</span>
                <span className="text-sm font-bold text-zinc-200 ml-auto">{formatEUR(detail.commande.montantTotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase">Acheteur</p>
                  <p className="text-sm text-zinc-200">{detail.commande.acheteur?.prenom} {detail.commande.acheteur?.nom}</p>
                  <p className="text-xs text-zinc-500">{detail.commande.acheteur?.email}</p>
                </div>
                <div className="p-3 rounded bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase">Vendeur</p>
                  <p className="text-sm text-zinc-200">{detail.commande.vendeur?.prenom} {detail.commande.vendeur?.nom}</p>
                  <p className="text-xs text-zinc-500">{detail.commande.vendeur?.email}</p>
                </div>
              </div>

              {detail.commande.revisionInfo && (
                <div className="p-3 rounded bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase mb-1">Revisions</p>
                  <p className="text-sm text-zinc-200">
                    {detail.commande.revisionInfo.revisionsUtilisees} / {detail.commande.revisionInfo.revisionsIncluses} utilisees
                    {!detail.commande.revisionInfo.accepteRevisions && ' (non acceptees)'}
                  </p>
                </div>
              )}

              {detail.commande.historique && detail.commande.historique.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Historique</p>
                  <div className="space-y-1">
                    {detail.commande.historique.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-zinc-800/30">
                        <Badge variant="outline" className="text-[10px]">{h.de} → {h.vers}</Badge>
                        <span className="text-zinc-500">{formatDate(h.date)}</span>
                        {h.commentaire && <span className="text-zinc-400 ml-auto line-clamp-1 max-w-xs">{h.commentaire}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============ PAGE PRINCIPALE ============

export default function MarketplacePage() {
  const [onglet, setOnglet] = useState<'services' | 'commandes'>('services')

  const { data: stats } = useQuery({
    queryKey: ['admin-marketplace-stats'],
    queryFn: () => marketplaceService.getCommandesStats(),
  })

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Marketplace</h1>
        </div>

        <StatsCards stats={stats} />

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/50 w-fit">
          <button
            onClick={() => setOnglet('services')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              onglet === 'services'
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="h-4 w-4 inline mr-2" />
            Services
          </button>
          <button
            onClick={() => setOnglet('commandes')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              onglet === 'commandes'
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Commandes
          </button>
        </div>

        {onglet === 'services' ? <ServicesTab /> : <CommandesTab />}
      </div>
    </PageTransition>
  )
}
