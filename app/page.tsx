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

// 🏖️ Categorias com ícone + capa (modelo profissional praia)
const CATEGORIAS = [
  {
    nome: 'Cadeiras de Praia',
    icone: '🪑',
    capa: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
  },
  {
    nome: 'Guarda-sol',
    icone: '☂️',
    capa: 'https://images.unsplash.com/photo-1526779259212-939e64788e3c',
  },
  {
    nome: 'Bebidas não alcoólicas',
    icone: '🥤',
    capa: 'https://images.unsplash.com/photo-1544145945-f90425340c7e',
  },
  {
    nome: 'Bebidas alcoólicas',
    icone: '🍹',
    capa: 'https://images.unsplash.com/photo-1514361892635-cebb7e6b3e56',
  },
  {
    nome: 'Para petiscar',
    icone: '🍤',
    capa: 'https://images.unsplash.com/photo-1604908554025-0c0a1e0b8c45',
  },
  {
    nome: 'Pratos',
    icone: '🍽️',
    capa: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  },
  {
    nome: 'Sobremesas',
    icone: '🍨',
    capa: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e',
  },
]

function Cardapio() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Cadeiras de Praia')
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')

  const categoriaAtual = CATEGORIAS.find(
    (c) => c.nome === categoriaAtiva
  )

  useEffect(() => {
    async function fetchProdutos() {
      if (!barracaId) return

      setLoading(true)

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria, ativo, imagem_url')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)

      if (!error && data) {
        setProdutos(data)
      }

      setLoading(false)
    }

    fetchProdutos()
  }, [barracaId])

  const produtosFiltrados = produtos.filter(
    (produto) => produto.categoria === categoriaAtiva
  )

  async function fazerPedido(produto: Produto) {
    if (!barracaId) return

    setMensagem('Enviando pedido...')

    const { error } = await supabase.from('pedidos').insert([
      {
        barraca_id: barracaId,
        status: 'novo',
        total: produto.preco,
      },
    ])

    if (error) {
      setMensagem('Erro ao fazer pedido 😢')
    } else {
      setMensagem(`Pedido de ${produto.nome} realizado! 🏖️`)
    }
  }

  if (!barracaId) {
    return <p>QR Code da barraca não encontrado.</p>
  }

  if (loading) {
    return (
      <p style={{ color: '#0a2540', fontWeight: '500' }}>
        Carregando cardápio...
      </p>
    )
  }

  return (
    <>
      {/* 🖼️ CAPA DA CATEGORIA */}
      {categoriaAtual && (
        <div
          style={{
            width: '100%',
            height: '150px',
            borderRadius: '18px',
            overflow: 'hidden',
            marginBottom: '16px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
          }}
        >
          <img
            src={categoriaAtual.capa}
            alt={categoriaAtual.nome}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      {/* 🔵 ABAS COM ÍCONES (FIXAS NO TOPO) */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '10px',
          marginBottom: '20px',
          padding: '12px 0',
          position: 'sticky',
          top: 0,
          background: '#f5f7fb',
          zIndex: 10,
        }}
      >
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.nome}
            onClick={() => setCategoriaAtiva(cat.nome)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '999px',
              border: 'none',
              whiteSpace: 'nowrap',
              fontWeight: '600',
              cursor: 'pointer',
              background:
                categoriaAtiva === cat.nome ? '#1e88e5' : '#e3f2fd',
              color: categoriaAtiva === cat.nome ? '#fff' : '#0a2540',
              boxShadow:
                categoriaAtiva === cat.nome
                  ? '0 4px 12px rgba(30,136,229,0.35)'
                  : 'none',
              transition: '0.2s',
              fontSize: '15px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{cat.icone}</span>
            {cat.nome}
          </button>
        ))}
      </div>

      {/* 📢 Mensagem de pedido */}
      {mensagem && (
        <div
          style={{
            background: '#e3f2fd',
            color: '#0a2540',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontWeight: 'bold',
          }}
        >
          {mensagem}
        </div>
      )}

      {/* 🛒 LISTA DE PRODUTOS COM IMAGEM */}
      {produtosFiltrados.length === 0 ? (
        <p style={{ color: '#333' }}>
          Nenhum item nesta categoria...
        </p>
      ) : (
        produtosFiltrados.map((produto) => (
          <div
            key={produto.id}
            style={{
              border: '1px solid #e6e6e6',
              marginBottom: '18px',
              borderRadius: '18px',
              background: '#ffffff',
              maxWidth: '420px',
              overflow: 'hidden',
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            }}
          >
            {/* 📸 IMAGEM DO PRODUTO */}
            {produto.imagem_url && (
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                style={{
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover',
                }}
              />
            )}

            <div style={{ padding: '18px' }}>
              <h3
                style={{
                  color: '#1a1a1a',
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '6px',
                }}
              >
                {produto.nome}
              </h3>

              <p
                style={{
                  fontWeight: 'bold',
                  fontSize: '22px',
                  color: '#0a2540',
                  marginBottom: '16px',
                }}
              >
                R$ {produto.preco}
              </p>

              <button
                onClick={() => fazerPedido(produto)}
                style={{
                  padding: '16px',
                  background: '#1e88e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  width: '100%',
                  fontWeight: 'bold',
                  fontSize: '17px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(30,136,229,0.35)',
                }}
              >
                Pedir 🏖️
              </button>
            </div>
          </div>
        ))
      )}
    </>
  )
}

export default function Home() {
  return (
    <main
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f7fb',
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          color: '#0a2540',
          fontSize: '28px',
          fontWeight: '700',
        }}
      >
        PraiaFlow 🌊
      </h1>

      <h2 style={{ color: '#1e88e5', marginBottom: '20px' }}>
        Serviço de Praia
      </h2>

      <Suspense fallback={<p>Carregando...</p>}>
        <Cardapio />
      </Suspense>
    </main>
  )
}
