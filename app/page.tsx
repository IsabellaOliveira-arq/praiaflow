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
  { nome: 'Guarda-sol', icone: '⛱️', capa: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
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
  const [categoriaAtiva, setCategoriaAtiva] = useState('Bebidas não alcoólicas')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [localEntrega, setLocalEntrega] = useState('')
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

    if (!localEntrega.trim()) {
      setMensagem('Informe onde você está (ex: Guarda-Sol 12) 📍')
      return
    }

    setMensagem('Enviando pedido...')

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert([{
        barraca_id: barracaId,
        status: 'novo',
        total,
        local: localEntrega
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
    setMensagem('Pedido enviado! Garçom irá até: ' + localEntrega + ' 🏖️')
  }

  if (loading) {
    return <p style={{ color: '#0a2540', fontWeight: 600 }}>Carregando cardápio...</p>
  }

  return (
    <>
      {/* CAMPO DE LOCALIZAÇÃO */}
      <div style={{
        marginBottom: 16,
        background: '#ffffff',
        padding: 16,
        borderRadius: 18,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
      }}>
        <label style={{
          fontWeight: 800,
          color: '#0a2540',
          display: 'block',
          marginBottom: 8,
          fontSize: 16
        }}>
          📍 Onde você está na praia?
        </label>

        <input
          type="text"
          placeholder="Ex: Guarda-Sol 12, Cadeira Azul ou Tenda 3"
          value={localEntrega}
          onChange={(e) => setLocalEntrega(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            border: '2px solid #e3f2fd',
            fontSize: 16,
            color: '#0a2540',
            fontWeight: 600,
            outline: 'none'
          }}
        />
      </div>

      {/* CAPA */}
      {categoriaAtual && (
        <img
          src={categoriaAtual.capa}
          style={{
            width: '100%',
            height: 140,
            objectFit: 'cover',
            borderRadius: 20,
            marginBottom: 16
          }}
        />
      )}

      {/* ABAS */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 10,
        marginBottom: 20,
        position: 'sticky',
        top: 0,
        background: '#f1f5f9',
        padding: '10px 0',
        zIndex: 10
      }}>
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
              color: categoriaAtiva === cat.nome ? '#ffffff' : '#0a2540',
              cursor: 'pointer',
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
        const itemCarrinho = carrinho.find(i => i.produto.id === produto.id)
        const quantidade = itemCarrinho?.quantidade || 0

        return (
          <div
            key={produto.id}
            style={{
              border: '1px solid #dbeafe',
              borderRadius: 20,
              marginBottom: 18,
              background: '#ffffff',
              boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
              padding: 18
            }}
          >
            <h3 style={{
              fontSize: 20,
              color: '#0a2540',
              fontWeight: 900,
              marginBottom: 6
            }}>
              {produto.nome}
            </h3>

            <p style={{
              fontWeight: 'bold',
              fontSize: 24,
              color: '#1565c0',
              marginBottom: 12
            }}>
              R$ {produto.preco}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => alterarQuantidade(produto, -1)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#e2e8f0',
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#0a2540',
                  cursor: 'pointer'
                }}
              >
                -
              </button>

              <span style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#0a2540',
                minWidth: 20,
                textAlign: 'center'
              }}>
                {quantidade}
              </span>

              <button
                onClick={() => alterarQuantidade(produto, 1)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#1565c0',
                  color: '#ffffff',
                  fontSize: 18,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>
        )
      })}

      {/* CARRINHO FIXO */}
      {carrinho.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          background: '#1565c0',
          color: '#ffffff',
          padding: 18,
          borderRadius: 20,
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)'
        }}>
          <strong style={{ fontSize: 18 }}>
            Total: R$ {total.toFixed(2)}
          </strong>

          <button
            onClick={enviarPedido}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 16,
              borderRadius: 14,
              border: 'none',
              fontWeight: 'bold',
              fontSize: 18,
              background: '#0a2540',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
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
      <h1 style={{ color: '#0a2540', fontWeight: 900 }}>
        PraiaFlow 🌊
      </h1>

      <Suspense fallback={<p>Carregando...</p>}>
        <Cardapio />
      </Suspense>
    </main>
  )
}
