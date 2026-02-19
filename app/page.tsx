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

function Cardapio() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
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
        .eq('ativo', true) // só produtos ativos
        .order('categoria', { ascending: true })

      if (!error && data) {
        setProdutos(data)
      }

      setLoading(false)
    }

    fetchProdutos()
  }, [barracaId])

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
      {mensagem && (
        <div
          style={{
            background: '#e3f2fd',
            color: '#0a2540',
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontWeight: 'bold',
          }}
        >
          {mensagem}
        </div>
      )}

      {produtos.length === 0 ? (
        <p style={{ color: '#333' }}>
          Nenhum produto encontrado para esta barraca...
        </p>
      ) : (
        produtos.map((produto) => (
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
            {/* Nome do Produto */}
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

            {/* Categoria */}
            <p
              style={{
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '10px',
              }}
            >
              {produto.categoria}
            </p>

            {/* Preço */}
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

            {/* Botão Azul (igual QR) */}
            <button
              onClick={() => fazerPedido(produto)}
              style={{
                padding: '16px',
                background: '#1e88e5', // azul principal
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                width: '100%',
                fontWeight: 'bold',
                fontSize: '17px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(30,136,229,0.4)',
                transition: 'all 0.2s ease',
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
          marginBottom: '4px',
        }}
      >
        PraiaFlow 🌊
      </h1>

      <h2
        style={{
          color: '#1e88e5',
          fontSize: '18px',
          marginBottom: '20px',
        }}
      >
        Cardápio Digital
      </h2>

      <Suspense fallback={<p>Carregando...</p>}>
        <Cardapio />
      </Suspense>
    </main>
  )
}
