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
}

// 🎨 Categorias com ícones (modelo praia profissional)
const CATEGORIAS = [
  { nome: 'Cadeiras de Praia', icone: '🪑' },
  { nome: 'Guarda-sol', icone: '☂️' },
  { nome: 'Bebidas não alcoólicas', icone: '🥤' },
  { nome: 'Bebidas alcoólicas', icone: '🍹' },
  { nome: 'Para petiscar', icone: '🍤' },
  { nome: 'Pratos', icone: '🍽️' },
  { nome: 'Sobremesas', icone: '🍨' },
]

function Cardapio() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Cadeiras de Praia')
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    async function fetchProdutos() {
      if (!barracaId) return

      setLoading(true)

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria, ativo')
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
      {/* 🔵 Abas com ícones (sticky topo) */}
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
              padding: '18px',
              marginBottom: '18px',
              borderRadius: '18px',
              background: '#ffffff',
              maxWidth: '420px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            }}
          >
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

      <h2
        style={{
          color: '#1e88e5',
          marginBottom: '20px',
        }}
      >
        Serviço de Praia
      </h2>

      <Suspense fallback={<p>Carregando...</p>}>
        <Cardapio />
      </Suspense>
    </main>
  )
}
