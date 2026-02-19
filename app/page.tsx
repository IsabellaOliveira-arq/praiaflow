'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'next/navigation'

type Produto = {
  id: string
  nome: string
  preco: number
  barraca_id: string
}

export default function Home() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchProdutos() {
      if (!barracaId) return

      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('barraca_id', barracaId)

      if (error) {
        console.error('Erro ao buscar produtos:', error)
      } else {
        setProdutos(data || [])
      }
    }

    fetchProdutos()
  }, [barracaId])

  async function fazerPedido(produto: Produto) {
    if (!barracaId) {
      setMensagem('Barraca não identificada ❗')
      return
    }

    setLoading(true)
    setMensagem('Enviando pedido...')

    const { error } = await supabase.from('pedidos').insert([
      {
        barraca_id: barracaId,
        status: 'novo',
        total: produto.preco,
      },
    ])

    if (error) {
      console.error('Erro ao criar pedido:', error)
      setMensagem('Erro ao fazer pedido 😢')
    } else {
      setMensagem(`Pedido de ${produto.nome} realizado! 🏖️`)
    }

    setLoading(false)
  }

  if (!barracaId) {
    return (
      <main style={{ padding: '20px' }}>
        <h1>PraiaFlow 🌊</h1>
        <p>QR Code da barraca não encontrado.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>PraiaFlow 🌊</h1>
      <h2>Cardápio Digital</h2>

      {mensagem && (
        <p
          style={{
            fontWeight: 'bold',
            color: mensagem.includes('Erro') ? 'red' : 'green',
          }}
        >
          {mensagem}
        </p>
      )}

      {produtos.length === 0 ? (
        <p>Nenhum produto encontrado para esta barraca...</p>
      ) : (
        produtos.map((produto) => (
          <div
            key={produto.id}
            style={{
              border: '1px solid #444',
              padding: '16px',
              marginBottom: '12px',
              borderRadius: '12px',
              background: '#111',
              maxWidth: '400px',
            }}
          >
            <h3>{produto.nome}</h3>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
              R$ {produto.preco}
            </p>

            <button
              onClick={() => fazerPedido(produto)}
              disabled={loading}
              style={{
                padding: '10px 18px',
                background: loading ? '#777' : '#00c853',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Enviando...' : 'Pedir 🛒'}
            </button>
          </div>
        ))
      )}
    </main>
  )
}
