'use client'

import { Suspense, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'next/navigation'

type Produto = {
  id: string
  nome: string
  preco: number
  barraca_id: string
}

function Cardapio() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProdutos() {
      if (!barracaId) return

      // 🔥 CACHE LOCAL (acelera MUITO no celular)
      const cacheKey = `produtos_${barracaId}`
      const cache = localStorage.getItem(cacheKey)

      if (cache) {
        setProdutos(JSON.parse(cache))
        setLoading(false)
      }

      // Busca atualizada no banco (em segundo plano)
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco, barraca_id') // query mais leve
        .eq('barraca_id', barracaId)

      if (!error && data) {
        setProdutos(data)
        localStorage.setItem(cacheKey, JSON.stringify(data)) // salva cache
      }

      setLoading(false)
    }

    fetchProdutos()
  }, [barracaId])

  async function fazerPedido(produto: Produto) {
    if (!barracaId) {
      setMensagem('Barraca não identificada ❗')
      return
    }

    setMensagem('Enviando pedido...')

    const { error } = await supabase.from('pedidos').insert([
      {
        barraca_id: barracaId,
        status: 'novo',
        total: produto.preco,
      },
    ])

    if (error) {
      console.error(error)
      setMensagem('Erro ao fazer pedido 😢')
    } else {
      setMensagem(`Pedido de ${produto.nome} realizado! 🏖️`)
    }
  }

  if (!barracaId) {
    return <p>QR Code da barraca não encontrado.</p>
  }

  if (loading) {
    return <p>Carregando cardápio da barraca...</p>
  }

  return (
    <>
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
              border: '1px solid #ddd',
              padding: '14px',
              marginBottom: '12px',
              borderRadius: '12px',
              background: '#ffffff',
              maxWidth: '420px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ margin: 0 }}>{produto.nome}</h3>
            <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '8px 0' }}>
              R$ {produto.preco}
            </p>

            <button
              onClick={() => fazerPedido(produto)}
              style={{
                padding: '10px 16px',
                background: '#00c853',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: '100%',
              }}
            >
              Pedir 🛒
            </button>
          </div>
        ))
      )}
    </>
  )
}

export default function Home() {
  return (
    <main style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>PraiaFlow 🌊</h1>
      <h2>Cardápio Digital</h2>

      <Suspense fallback={<p>Carregando...</p>}>
        <Cardapio />
      </Suspense>
    </main>
  )
}
