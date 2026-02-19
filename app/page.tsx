'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Produto = {
  id: string
  nome: string
  preco: number
  categoria: string
  ativo: boolean
}

type ItemCarrinho = {
  produto: Produto
  quantidade: number
  observacao: string
}

const iconesCategoria: Record<string, string> = {
  'Cadeiras de Praia': '🏖️',
  'Guarda-sol': '⛱️',
  'Bebidas não alcoólicas': '🥤',
  'Bebidas alcoólicas': '🍹',
  'Para petiscar': '🍤',
  'Pratos': '🍽️',
  'Pratos Principais': '🍽️',
  'Sobremesas': '🍰',
}

export default function Page() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [nomeCliente, setNomeCliente] = useState('')
  const [localEntrega, setLocalEntrega] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      if (!barracaId) return

      const { data } = await supabase
        .from('produtos')
        .select('*')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)
        .order('categoria', { ascending: true })

      if (data) setProdutos(data)
      setLoading(false)
    }

    carregar()
  }, [barracaId])

  const categorias = useMemo(() => {
    const unicas = Array.from(new Set(produtos.map(p => p.categoria)))
    return ['Todas', ...unicas]
  }, [produtos])

  const produtosFiltrados =
    categoriaAtiva === 'Todas'
      ? produtos
      : produtos.filter(p => p.categoria === categoriaAtiva)

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
      }

      if (delta > 0) {
        return [...prev, { produto, quantidade: 1, observacao: '' }]
      }

      return prev
    })
  }

  function atualizarObservacao(produtoId: string, texto: string) {
    setCarrinho(prev =>
      prev.map(item =>
        item.produto.id === produtoId
          ? { ...item, observacao: texto }
          : item
      )
    )
  }

  const total = carrinho.reduce(
    (acc, item) => acc + item.produto.preco * item.quantidade,
    0
  )

  async function enviarPedido() {
    if (!nomeCliente || !localEntrega) {
      alert('Preencha seu nome e o local de entrega 🏖️')
      return
    }

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert([
        {
          barraca_id: barracaId,
          nome_cliente: nomeCliente,
          local_entrega: localEntrega,
          total: total,
          status: 'novo',
        },
      ])
      .select()
      .single()

    if (error || !pedido) {
      alert('Erro ao enviar pedido')
      return
    }

    const itens = carrinho.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
      observacoes: item.observacao,
    }))

    await supabase.from('itens_pedido').insert(itens)

    alert('Pedido enviado com sucesso! 🌊')
    setCarrinho([])
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: '#0d47a1' }}>
        Carregando cardápio da praia...
      </div>
    )
  }

  return (
    <div style={container}>
      {/* HEADER BONITO */}
      <h1 style={titulo}>PraiaFlow 🌊</h1>

      {/* COMANDA */}
      <input
        style={input}
        placeholder="👤 Seu nome (comanda individual)"
        value={nomeCliente}
        onChange={(e) => setNomeCliente(e.target.value)}
      />

      <input
        style={input}
        placeholder="📍 Ex: Guarda-sol 12 / Cadeira Azul"
        value={localEntrega}
        onChange={(e) => setLocalEntrega(e.target.value)}
      />

      {/* ABAS COM ÍCONES */}
      <div style={abasContainer}>
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            style={{
              ...aba,
              background:
                categoriaAtiva === cat ? '#1565c0' : '#e3f2fd',
              color:
                categoriaAtiva === cat ? '#ffffff' : '#0d47a1',
            }}
          >
            {cat === 'Todas'
              ? '📋 Todas'
              : `${iconesCategoria[cat] || '🍽️'} ${cat}`}
          </button>
        ))}
      </div>

      {/* PRODUTOS BONITOS */}
      {produtosFiltrados.map(produto => {
        const item = carrinho.find(i => i.produto.id === produto.id)
        const qtd = item?.quantidade || 0

        return (
          <div key={produto.id} style={card}>
            <div style={nomeProduto}>{produto.nome}</div>
            <div style={preco}>R$ {produto.preco}</div>

            <textarea
              placeholder="Observações (ex: sem gelo, fruta: morango, zero...)"
              onChange={(e) =>
                atualizarObservacao(produto.id, e.target.value)
              }
              style={textarea}
            />

            <div style={controle}>
              <button
                style={botaoMenos}
                onClick={() => alterarQuantidade(produto, -1)}
              >
                −
              </button>

              <span style={quantidade}>{qtd}</span>

              <button
                style={botaoMais}
                onClick={() => alterarQuantidade(produto, 1)}
              >
                +
              </button>
            </div>
          </div>
        )
      })}

      {/* CARRINHO FIXO LINDO */}
      {carrinho.length > 0 && (
        <div style={carrinhoBox}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            Total: R$ {total.toFixed(2)}
          </div>

          <button style={botaoEnviar} onClick={enviarPedido}>
            Enviar Pedido 🏖️
          </button>
        </div>
      )}
    </div>
  )
}

/* ESTILOS PREMIUM (PRAIA + MOBILE) */
const container = {
  maxWidth: 520,
  margin: '0 auto',
  padding: 16,
  background: '#f4f8ff',
  minHeight: '100vh',
}

const titulo = {
  fontSize: 30,
  fontWeight: 900,
  color: '#0d47a1',
  marginBottom: 16,
}

const input = {
  width: '100%',
  padding: 14,
  borderRadius: 14,
  border: '2px solid #bbdefb',
  marginBottom: 12,
  fontSize: 16,
  background: '#ffffff',
  color: '#0d1b2a',
}

const abasContainer = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto' as const,
  marginBottom: 20,
}

const aba = {
  padding: '10px 16px',
  borderRadius: 999,
  border: 'none',
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
  cursor: 'pointer',
}

const card = {
  background: '#ffffff',
  borderRadius: 20,
  padding: 18,
  marginBottom: 16,
  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
}

const nomeProduto = {
  fontSize: 20,
  fontWeight: 800,
  color: '#0d1b2a',
}

const preco = {
  fontSize: 22,
  fontWeight: 900,
  color: '#1565c0',
  marginBottom: 10,
}

const textarea = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #e0e0e0',
  marginBottom: 12,
  color: '#000',
  background: '#fff',
}

const controle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const botaoMenos = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: 'none',
  background: '#e3f2fd',
  fontSize: 20,
  fontWeight: 'bold',
  cursor: 'pointer',
}

const botaoMais = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: 'none',
  background: '#1565c0',
  color: '#fff',
  fontSize: 20,
  fontWeight: 'bold',
  cursor: 'pointer',
}

const quantidade = {
  fontSize: 18,
  fontWeight: 900,
  color: '#0d47a1',
  minWidth: 24,
  textAlign: 'center' as const,
}

const carrinhoBox = {
  position: 'fixed' as const,
  bottom: 16,
  left: 16,
  right: 16,
  background: '#0d47a1',
  color: '#fff',
  padding: 18,
  borderRadius: 20,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
}

const botaoEnviar = {
  width: '100%',
  marginTop: 10,
  padding: 16,
  borderRadius: 14,
  border: 'none',
  background: '#1565c0',
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
  cursor: 'pointer',
}
