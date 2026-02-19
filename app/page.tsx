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
  { nome: 'Bebidas não alcoólicas', icone: '🥤' },
  { nome: 'Bebidas alcoólicas', icone: '🍹' },
  { nome: 'Para petiscar', icone: '🍤' },
  { nome: 'Pratos', icone: '🍽️' },
  { nome: 'Sobremesas', icone: '🍨' },
  { nome: 'Cadeiras de Praia', icone: '🪑' },
  { nome: 'Guarda-sol', icone: '⛱️' },
]

function Cardapio() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('Bebidas não alcoólicas')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [localEntrega, setLocalEntrega] = useState('')
  const [nomeComanda, setNomeComanda] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProdutos() {
      if (!barracaId) return
      setLoading(true)

      const { data } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria, ativo, imagem_url')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

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
      const existente = prev.find(i => i.produto.id === produto.id)

      if (existente) {
        const novaQtd = existente.quantidade + delta
        if (novaQtd <= 0) {
          return prev.filter(i => i.produto.id !== produto.id)
        }
        return prev.map(i =>
          i.produto.id === produto.id
            ? { ...i, quantidade: novaQtd }
            : i
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

    if (!localEntrega.trim()) {
      setMensagem('Informe onde você está (ex: Guarda-Sol 12) 📍')
      return
    }

    if (!nomeComanda.trim()) {
      setMensagem('Informe seu nome para a comanda 👤')
      return
    }

    setMensagem('Enviando seu pedido...')

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert([{
        barraca_id: barracaId,
        status: 'novo',
        total,
        local: localEntrega,
        comanda: nomeComanda
      }])
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
    setMensagem(`Pedido enviado para ${nomeComanda} em ${localEntrega} 🏖️`)
  }

  if (loading) {
    return <p style={{ color: '#0a2540', fontWeight: 700 }}>Carregando cardápio...</p>
  }

  return (
    <>
      {/* LOCAL */}
      <div style={{
        background: '#ffffff',
        padding: 16,
        borderRadius: 18,
        marginBottom: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
      }}>
        <label style={{ fontWeight: 800, color: '#0a2540' }}>
          📍 Onde você está?
        </label>
        <input
          type="text"
          placeholder="Ex: Guarda-Sol 12"
          value={localEntrega}
          onChange={(e) => setLocalEntrega(e.target.value)}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 14,
            borderRadius: 12,
            border: '2px solid #e3f2fd',
            fontSize: 16,
            color: '#0a2540',
            fontWeight: 600
          }}
        />
      </div>

      {/* COMANDA INDIVIDUAL */}
      <div style={{
        background: '#ffffff',
        padding: 16,
        borderRadius: 18,
        marginBottom: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
      }}>
        <label style={{ fontWeight: 800, color: '#0a2540' }}>
          👤 Seu nome (comanda individual)
        </label>
        <input
          type="text"
          placeholder="Ex: Ana, João, Casal, Família"
          value={nomeComanda}
          onChange={(e) => setNomeComanda(e.target.value)}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 14,
            borderRadius: 12,
            border: '2px solid #e3f2fd',
            fontSize: 16,
            color: '#0a2540',
            fontWeight: 600
          }}
        />
      </div>

      {/* CATEGORIAS */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: 10, marginBottom: 20 }}>
        {CATEGORIAS.map(cat => (
          <button
            key={cat.nome}
            onClick={() => setCategoriaAtiva(cat.nome)}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: 'none',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              background: categoriaAtiva === cat.nome ? '#1565c0' : '#e3f2fd',
              color: categoriaAtiva === cat.nome ? '#fff' : '#0a2540',
              cursor: 'pointer'
            }}
          >
            {cat.icone} {cat.nome}
          </button>
        ))}
      </div>

      {mensagem && (
        <p style={{ fontWeight: 'bold', color: '#1565c0' }}>
          {mensagem}
        </p>
      )}

      {/* PRODUTOS */}
      {produtosFiltrados.map(produto => {
        const item = carrinho.find(i => i.produto.id === produto.id)
        const qtd = item?.quantidade || 0

        return (
          <div key={produto.id} style={{
            background: '#ffffff',
            padding: 18,
            borderRadius: 18,
            marginBottom: 18,
            boxShadow: '0 10px 28px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0a2540' }}>
              {produto.nome}
            </h3>

            <p style={{ fontSize: 24, fontWeight: 'bold', color: '#1565c0' }}>
              R$ {produto.preco}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => alterarQuantidade(produto, -1)}
                style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#e2e8f0', fontWeight: 'bold' }}>
                -
              </button>

              <span style={{ fontSize: 18, fontWeight: 'bold', color: '#0a2540' }}>
                {qtd}
              </span>

              <button onClick={() => alterarQuantidade(produto, 1)}
                style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#1565c0', color: '#fff', fontWeight: 'bold' }}>
                +
              </button>
            </div>
          </div>
        )
      })}

      {/* CARRINHO */}
      {carrinho.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          background: '#1565c0',
          color: '#fff',
          padding: 18,
          borderRadius: 20,
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)'
        }}>
          <strong style={{ fontSize: 18 }}>
            {nomeComanda || 'Sua comanda'} • Total: R$ {total.toFixed(2)}
          </strong>

          <button onClick={enviarPedido}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 16,
              borderRadius: 14,
              border: 'none',
              fontWeight: 'bold',
              fontSize: 18,
              background: '#0a2540',
              color: '#fff',
              cursor: 'pointer'
            }}>
            Enviar pedido 🏖️
          </button>
        </div>
      )}
    </>
  )
}

export default function Home() {
  return (
    <main style={{
      padding: 20,
      background: '#f1f5f9',
      minHeight: '100vh',
      color: '#0a2540'
    }}>
      <h1 style={{ fontWeight: 900 }}>PraiaFlow 🌊</h1>
      <Suspense fallback={<p>Carregando...</p>}>
        <Cardapio />
      </Suspense>
    </main>
  )
}
