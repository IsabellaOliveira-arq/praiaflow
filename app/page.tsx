'use client'

import { Suspense, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'next/navigation'

type Produto = {
  id: string
  nome: string
  preco: number
  categoria: string
  ativo: boolean
  imagem_url?: string
}

type ItemCarrinho = {
  produto: Produto
  quantidade: number
}

const CATEGORIAS = [
  { nome: 'Cadeiras de Praia', icone: '🪑', capa: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
  { nome: 'Guarda-sol', icone: '☂️', capa: 'https://images.unsplash.com/photo-1526779259212-939e64788e3c' },
  { nome: 'Bebidas não alcoólicas', icone: '🥤', capa: 'https://images.unsplash.com/photo-1544145945-f90425340c7e' },
  { nome: 'Bebidas alcoólicas', icone: '🍹', capa: 'https://images.unsplash.com/photo-1514361892635-cebb7e6b3e56' },
  { nome: 'Para petiscar', icone: '🍤', capa: 'https://images.unsplash.com/photo-1604908554025-0c0a1e0b8c45' },
  { nome: 'Pratos', icone: '🍽️', capa: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' },
  { nome: 'Sobremesas', icone: '🍨', capa: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e' },
]

function Cardapio() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('Cadeiras de Praia')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')

  const categoriaAtual = CATEGORIAS.find(c => c.nome === categoriaAtiva)

  useEffect(() => {
    async function fetchProdutos() {
      if (!barracaId) return
      setLoading(true)

      const { data } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria, ativo, imagem_url')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)

      if (data) setProdutos(data)
      setLoading(false)
    }

    fetchProdutos()
  }, [barracaId])

  const produtosFiltrados = produtos.filter(
    p => p.categoria === categoriaAtiva
  )

  function alterarQuantidade(produto: Produto, delta: number) {
    setCarrinho(prev => {
      const existente = prev.find(item => item.produto.id === produto.id)

      if (existente) {
        const novaQtd = existente.quantidade + delta
        if (novaQtd <= 0) {
          return prev.filter(item => item.produto.id !== produto.id)
        }
        return prev.map(item =>
          item.produto.id === produto.id
            ? { ...item, quantidade: novaQtd }
            : item
        )
      } else if (delta > 0) {
        return [...prev, { produto, quantidade: 1 }]
      }

      return prev
    })
  }

  const total = carrinho.reduce(
    (acc, item) => acc + item.produto.preco * item.quantidade,
    0
  )

  async function enviarPedido() {
    if (!barracaId || carrinho.length === 0) return

    setMensagem('Enviando pedido completo...')

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert([{ barraca_id: barracaId, status: 'novo', total }])
      .select()
      .single()

    if (error || !pedido) {
      setMensagem('Erro ao enviar pedido 😢')
      return
    }

    const itens = carrinho.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
    }))

    await supabase.from('itens_pedido').insert(itens)

    setCarrinho([])
    setMensagem('Pedido enviado com sucesso! 🏖️')
  }

  if (loading) return <p>Carregando cardápio...</p>

  return (
    <>
      {/* CAPA */}
      {categoriaAtual && (
        <img
          src={categoriaAtual.capa}
          style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 18, marginBottom: 16 }}
        />
      )}

      {/* ABAS */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: 10, marginBottom: 20 }}>
        {CATEGORIAS.map(cat => (
          <button
            key={cat.nome}
            onClick={() => setCategoriaAtiva(cat.nome)}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: 'none',
              fontWeight: 600,
              background: categoriaAtiva === cat.nome ? '#1e88e5' : '#e3f2fd',
              color: categoriaAtiva === cat.nome ? '#fff' : '#0a2540',
              cursor: 'pointer',
            }}
          >
            {cat.icone} {cat.nome}
          </button>
        ))}
      </div>

      {mensagem && <p style={{ fontWeight: 'bold', color: '#0a2540' }}>{mensagem}</p>}

      {/* PRODUTOS */}
      {produtosFiltrados.map(produto => {
        const itemCarrinho = carrinho.find(i => i.produto.id === produto.id)
        const quantidade = itemCarrinho?.quantidade || 0

        return (
          <div key={produto.id} style={{
            border: '1px solid #e6e6e6',
            borderRadius: 18,
            marginBottom: 18,
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
          }}>
            {produto.imagem_url && (
              <img src={produto.imagem_url} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
            )}

            <div style={{ padding: 16 }}>
              <h3 style={{ fontSize: 20 }}>{produto.nome}</h3>
              <p style={{ fontWeight: 'bold', fontSize: 22, color: '#0a2540' }}>
                R$ {produto.preco}
              </p>

              {/* CONTADOR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => alterarQuantidade(produto, -1)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#eee' }}>-</button>

                <span style={{ fontSize: 18, fontWeight: 'bold' }}>{quantidade}</span>

                <button onClick={() => alterarQuantidade(produto, 1)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#1e88e5', color: '#fff' }}>+</button>
              </div>
            </div>
          </div>
        )
      })}

      {/* CARRINHO FIXO */}
      {carrinho.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          right: 20,
          background: '#1e88e5',
          color: '#fff',
          padding: 16,
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <strong>Total: R$ {total.toFixed(2)}</strong>
          <button onClick={enviarPedido}
            style={{
              width: '100%',
              marginTop: 10,
              padding: 14,
              borderRadius: 12,
              border: 'none',
              fontWeight: 'bold',
              fontSize: 16,
              background: '#0a2540',
              color: '#fff',
              cursor: 'pointer'
            }}>
            Enviar pedido 🛒
          </button>
        </div>
      )}
    </>
  )
}

export default function Home() {
  return (
    <main style={{ padding: 20, background: '#f5f7fb', minHeight: '100vh' }}>
      <h1 style={{ color: '#0a2540' }}>PraiaFlow 🌊</h1>
      <Suspense fallback={<p>Carregando...</p>}>
        <Cardapio />
      </Suspense>
    </main>
  )
}
