'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

function formatarCategoria(texto: string) {
  if (!texto) return 'Outros'

  return texto
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

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
  'cadeiras de praia': '🏖️',
  'guarda-sol': '⛱️',
  'bebidas alcoólicas': '🍹',
  'bebidas não alcoólicas': '🥤',
  'para petiscar': '🍤',
  'pratos': '🍽️',
  'sobremesas': '🍰',
}

const imagensCategoria: Record<string, string> = {
  'todas': '/banners/todas.jpg',
  'guarda-sol': '/banners/guarda-sol.jpg',
  'cadeiras de praia': '/banners/cadeiras.jpg',
  'bebidas não alcoólicas': '/banners/bebidas-nao-alcoolicas.jpg',
  'bebidas alcoólicas': '/banners/bebidas-alcoolicas.jpg',
  'para petiscar': '/banners/petiscos.jpg',
  'pratos': '/banners/pratos.jpg',
  'sobremesas': '/banners/sobremesas.jpg',
}

export default function CardapioCliente() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [nomeCliente, setNomeCliente] = useState('')
  const [localEntrega, setLocalEntrega] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarProdutos() {
      try {
        if (!barracaId) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('barraca_id', barracaId)
          .eq('ativo', true)

        if (error) {
          console.error('Erro ao carregar produtos:', error)
          setProdutos([])
        } else if (data) {
          setProdutos(data as Produto[])
        }
      } catch (err) {
        console.error('Erro inesperado:', err)
      } finally {
        setLoading(false)
      }
    }

    carregarProdutos()
  }, [barracaId])

  const categorias = useMemo(() => {
    const categoriasBanco = Array.from(
      new Set(produtos.map(p => (p.categoria || '').toLowerCase()))
    )

    const ordemFixa = [
      'todas',
      'guarda-sol',
      'cadeiras de praia',
      'bebidas não alcoólicas',
      'bebidas alcoólicas',
      'para petiscar',
      'pratos',
      'sobremesas',
    ]

    return ordemFixa.filter(
      (cat) => cat === 'todas' || categoriasBanco.includes(cat)
    )
  }, [produtos])

  const produtosFiltrados =
    categoriaAtiva === 'todas'
      ? produtos
      : produtos.filter(
          (p) => (p.categoria || '').toLowerCase() === categoriaAtiva
        )

  function alterarQuantidade(produto: Produto, delta: number) {
    setCarrinho((prev) => {
      const existente = prev.find((i) => i.produto.id === produto.id)

      if (existente) {
        const novaQtd = existente.quantidade + delta
        if (novaQtd <= 0) {
          return prev.filter((i) => i.produto.id !== produto.id)
        }
        return prev.map((i) =>
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
    setCarrinho((prev) =>
      prev.map((item) =>
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
    try {
      if (!barracaId) {
        alert('Barraca não identificada.')
        return
      }

      if (!nomeCliente || !localEntrega) {
        alert('Preencha seu nome e o local (ex: Guarda-sol 12)')
        return
      }

      const { data: pedido, error } = await supabase
        .from('pedidos')
        .insert([
          {
            barraca_id: barracaId,
            comanda: nomeCliente,
            local: localEntrega,
            total: total,
            status: 'novo',
          },
        ])
        .select()
        .single()

      if (error || !pedido) {
        console.error(error)
        alert('Erro ao enviar pedido')
        return
      }

      const itens = carrinho.map((item) => ({
        pedido_id: pedido.id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco,
        observacoes: item.observacao,
      }))

      await supabase.from('itens_pedido').insert(itens)

      alert('Pedido enviado com sucesso! 🌊')
      setCarrinho([])
    } catch (err) {
      console.error('Erro ao enviar pedido:', err)
      alert('Erro inesperado ao enviar pedido')
    }
  }

  if (loading) {
    return (
      <h2 style={{ padding: 24, color: '#0d47a1' }}>
        Carregando cardápio...
      </h2>
    )
  }

  return (
    <div style={container}>
      <h1 style={titulo}>PraiaFlow 🌊</h1>

      {/* BANNER DINÂMICO */}
      <div style={bannerContainer}>
        <Image
          src={imagensCategoria[categoriaAtiva] || imagensCategoria['todas']}
          alt="Categoria"
          fill
          style={bannerImagem}
          sizes="100vw"
          priority
        />
      </div>

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

      <div style={abasContainer}>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            style={{
              ...aba,
              background:
                categoriaAtiva === cat ? '#1565c0' : '#e3f2fd',
              color:
                categoriaAtiva === cat ? '#fff' : '#0d47a1',
            }}
          >
            {cat === 'todas'
              ? '📋 Todas'
              : `${iconesCategoria[cat] || '🍽️'} ${formatarCategoria(
                  cat
                )}`}
          </button>
        ))}
      </div>

      {produtosFiltrados.map((produto) => {
        const item = carrinho.find(
          (i) => i.produto.id === produto.id
        )
        const qtd = item?.quantidade || 0

        return (
          <div key={produto.id} style={card}>
            <div style={linhaTopo}>
              <div style={nomeProduto}>{produto.nome}</div>
              <div style={preco}>
                R$ {produto.preco.toFixed(2)}
              </div>
            </div>

            <textarea
              placeholder="Observações (ex: sem gelo, limão, ketchup...)"
              value={item?.observacao || ''}
              onChange={(e) =>
                atualizarObservacao(
                  produto.id,
                  e.target.value
                )
              }
              style={textarea}
            />

            <div style={controle}>
              <button
                style={botaoMenos}
                onClick={() =>
                  alterarQuantidade(produto, -1)
                }
              >
                −
              </button>

              <span style={quantidade}>{qtd}</span>

              <button
                style={botaoMais}
                onClick={() =>
                  alterarQuantidade(produto, 1)
                }
              >
                +
              </button>
            </div>
          </div>
        )
      })}

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

/* ESTILOS */
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

const bannerContainer = {
  position: 'relative' as const,
  width: '100%',
  height: 160,
  borderRadius: 20,
  overflow: 'hidden' as const,
  marginBottom: 16,
}

const bannerImagem = {
  objectFit: 'cover' as const,
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

const linhaTopo = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 8,
}

const nomeProduto = {
  fontSize: 20,
  fontWeight: 800,
  color: '#0d1b2a',
  flex: 1,
}

const preco = {
  fontSize: 22,
  fontWeight: 900,
  color: '#1565c0',
  whiteSpace: 'nowrap' as const,
}

const textarea = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  marginBottom: 12,
  background: '#ffffff',
  color: '#0d1b2a',
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