'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'next/navigation'

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
    async function carregarProdutos() {
      if (!barracaId) return

      const { data } = await supabase
        .from('produtos')
        .select('*')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)
        .order('categoria', { ascending: true })

      if (data) {
        setProdutos(data)
      }

      setLoading(false)
    }

    carregarProdutos()
  }, [barracaId])

  const categorias = ['Todas', ...new Set(produtos.map(p => p.categoria))]

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
      } else if (delta > 0) {
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
      alert('Preencha seu nome e o local (ex: Guarda-sol 12)')
      return
    }

    const { data: pedido } = await supabase
      .from('pedidos')
      .insert([
        {
          barraca_id: barracaId,
          nome_cliente: nomeCliente,
          local_entrega: localEntrega,
          total: total
        }
      ])
      .select()
      .single()

    if (!pedido) return

    const itens = carrinho.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
      observacoes: item.observacao
    }))

    await supabase.from('itens_pedido').insert(itens)

    alert('Pedido enviado com sucesso! 🏖️')
    setCarrinho([])
  }

  if (loading) {
    return <p style={{ padding: 20 }}>Carregando cardápio...</p>
  }

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: 16,
      background: '#f2f6ff',
      minHeight: '100vh'
    }}>
      {/* HEADER BONITO */}
      <h1 style={{
        color: '#0d47a1',
        fontSize: 28,
        fontWeight: 900,
        marginBottom: 16
      }}>
        PraiaFlow 🌊
      </h1>

      {/* COMANDA INDIVIDUAL */}
      <input
        placeholder="👤 Seu nome (comanda individual)"
        value={nomeCliente}
        onChange={(e) => setNomeCliente(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="📍 Ex: Guarda-sol 12 / Cadeira Azul"
        value={localEntrega}
        onChange={(e) => setLocalEntrega(e.target.value)}
        style={{ ...inputStyle, marginTop: 10 }}
      />

      {/* ABAS DE CATEGORIA (COMO ESTAVA ANTES) */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        margin: '20px 0'
      }}>
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: 'none',
              background:
                categoriaAtiva === cat ? '#1565c0' : '#e3f2fd',
              color:
                categoriaAtiva === cat ? '#fff' : '#0d47a1',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* CARDS BONITOS */}
      {produtosFiltrados.map(produto => {
        const item = carrinho.find(i => i.produto.id === produto.id)
        const qtd = item?.quantidade || 0

        return (
          <div key={produto.id} style={cardStyle}>
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#1a1a1a'
            }}>
              {produto.nome}
            </h2>

            <p style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: '#1565c0',
              marginBottom: 10
            }}>
              R$ {produto.preco}
            </p>

            <textarea
              placeholder="Observações (ex: sem gelo, pouco açúcar)"
              onChange={(e) =>
                atualizarObservacao(produto.id, e.target.value)
              }
              style={textareaStyle}
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <button onClick={() => alterarQuantidade(produto, -1)} style={botaoQtd}>
                -
              </button>

              <span style={{
                fontSize: 18,
                fontWeight: 800,
                minWidth: 20,
                textAlign: 'center',
                color: '#0d47a1'
              }}>
                {qtd}
              </span>

              <button onClick={() => alterarQuantidade(produto, 1)} style={botaoAdd}>
                +
              </button>
            </div>
          </div>
        )
      })}

      {/* CARRINHO FIXO BONITO */}
      {carrinho.length > 0 && (
        <div style={carrinhoStyle}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            Total: R$ {total.toFixed(2)}
          </div>

          <button onClick={enviarPedido} style={botaoEnviar}>
            Enviar Pedido 🏖️
          </button>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: 14,
  borderRadius: 14,
  border: '2px solid #e3f2fd',
  fontSize: 16,
  background: '#ffffff'
}

const cardStyle = {
  background: '#ffffff',
  borderRadius: 18,
  padding: 18,
  marginBottom: 16,
  boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
}

const textareaStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #e0e0e0',
  marginBottom: 12
}

const botaoQtd = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: 'none',
  background: '#e3f2fd',
  fontSize: 18,
  fontWeight: 'bold',
  cursor: 'pointer'
}

const botaoAdd = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: 'none',
  background: '#1565c0',
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
  cursor: 'pointer'
}

const carrinhoStyle = {
  position: 'fixed',
  bottom: 16,
  left: 16,
  right: 16,
  background: '#0d47a1',
  color: '#fff',
  padding: 18,
  borderRadius: 20,
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
}

const botaoEnviar = {
  width: '100%',
  marginTop: 10,
  padding: 16,
  borderRadius: 14,
  border: 'none',
  background: '#1565c0',
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer'
}
