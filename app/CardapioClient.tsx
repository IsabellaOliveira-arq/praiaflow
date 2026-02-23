'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

function formatarCategoria(texto: string) {
  if (!texto) return 'Outros'
  return texto.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
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
  opcaoSelecionada?: string
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
  const [opcoes, setOpcoes] = useState<Record<string, string[]>>({})
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [nomeCliente, setNomeCliente] = useState('')
  const [localEntrega, setLocalEntrega] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarDados() {
      if (!barracaId) {
        setLoading(false)
        return
      }

      const { data: produtosData } = await supabase
        .from('produtos')
        .select('*')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)

      if (produtosData) setProdutos(produtosData)

      const { data: opcoesData } = await supabase
        .from('opcoes_produto')
        .select('produto_id, nome')
        .eq('ativo', true)

      if (opcoesData) {
        const agrupadas: Record<string, string[]> = {}
        opcoesData.forEach((op) => {
          if (!agrupadas[op.produto_id]) {
            agrupadas[op.produto_id] = []
          }
          agrupadas[op.produto_id].push(op.nome)
        })
        setOpcoes(agrupadas)
      }

      setLoading(false)
    }

    carregarDados()
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

  function selecionarOpcao(produtoId: string, opcao: string) {
    setCarrinho((prev) => {
      const existente = prev.find(i => i.produto.id === produtoId)

      if (existente) {
        return prev.map(i =>
          i.produto.id === produtoId
            ? { ...i, opcaoSelecionada: opcao }
            : i
        )
      }

      const produto = produtos.find(p => p.id === produtoId)
      if (!produto) return prev

      return [
        ...prev,
        {
          produto,
          quantidade: 0,
          observacao: '',
          opcaoSelecionada: opcao,
        },
      ]
    })
  }

  function alterarQuantidade(produto: Produto, delta: number) {
    setCarrinho((prev) => {
      const existente = prev.find(i => i.produto.id === produto.id)
      const temOpcoes = opcoes[produto.id]?.length > 0

      if (temOpcoes && !existente?.opcaoSelecionada) {
        alert('Selecione o tipo antes de adicionar.')
        return prev
      }

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
        return [
          ...prev,
          {
            produto,
            quantidade: 1,
            observacao: '',
            opcaoSelecionada: undefined,
          },
        ]
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
    if (!barracaId) return

    const itensInvalidos = carrinho.some(item =>
      opcoes[item.produto.id]?.length > 0 &&
      !item.opcaoSelecionada
    )

    if (itensInvalidos) {
      alert('Selecione todas as opções obrigatórias.')
      return
    }

    const { data: pedido } = await supabase
      .from('pedidos')
      .insert([
        {
          barraca_id: barracaId,
          comanda: nomeCliente,
          local: localEntrega,
          total,
          status: 'novo',
        },
      ])
      .select()
      .single()

    if (!pedido) return

    const itens = carrinho.map((item) => ({
      pedido_id: pedido.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
      observacoes: item.opcaoSelecionada
        ? `Opção: ${item.opcaoSelecionada} | ${item.observacao}`
        : item.observacao,
    }))

    await supabase.from('itens_pedido').insert(itens)

    alert('Pedido enviado com sucesso! 🌊')
    setCarrinho([])
  }

  if (loading) {
    return <h2 style={{ padding: 24 }}>Carregando cardápio...</h2>
  }

  return (
    <div style={container}>
      <h1 style={titulo}>PraiaFlow 🌊</h1>

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
        placeholder="👤 Seu nome"
        value={nomeCliente}
        onChange={(e) => setNomeCliente(e.target.value)}
      />

      <input
        style={input}
        placeholder="📍 Ex: Guarda-sol 12"
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
              : `${iconesCategoria[cat] || '🍽️'} ${formatarCategoria(cat)}`}
          </button>
        ))}
      </div>

      {produtosFiltrados.map((produto) => {
        const item = carrinho.find(i => i.produto.id === produto.id)
        const qtd = item?.quantidade || 0
        const opcoesProduto = opcoes[produto.id] || []

        return (
          <div key={produto.id} style={card}>
            <div style={linhaTopo}>
              <div style={nomeProduto}>{produto.nome}</div>
              <div style={preco}>R$ {produto.preco.toFixed(2)}</div>
            </div>

            {opcoesProduto.length > 0 && (
              <div style={boxOpcoes}>
                {opcoesProduto.map((opcao) => {
                  const selecionada = item?.opcaoSelecionada === opcao
                  return (
                    <button
                      key={opcao}
                      onClick={() => selecionarOpcao(produto.id, opcao)}
                      style={{
                        ...botaoOpcao,
                        background: selecionada ? '#1565c0' : '#e3f2fd',
                        color: selecionada ? '#fff' : '#0d47a1',
                        border: selecionada ? '2px solid #0d47a1' : 'none',
                      }}
                    >
                      {opcao}
                    </button>
                  )
                })}
              </div>
            )}

            <textarea
              placeholder="Observações..."
              value={item?.observacao || ''}
              onChange={(e) =>
                atualizarObservacao(produto.id, e.target.value)
              }
              style={textarea}
            />

            <div style={controle}>
              <button style={botaoMenos} onClick={() => alterarQuantidade(produto, -1)}>−</button>
              <span style={quantidade}>{qtd}</span>
              <button style={botaoMais} onClick={() => alterarQuantidade(produto, 1)}>+</button>
            </div>
          </div>
        )
      })}

      {carrinho.length > 0 && (
        <div style={carrinhoBox}>
          <div style={{ fontWeight: 800 }}>
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

const container = { maxWidth: 520, margin: '0 auto', padding: 16, background: '#f4f8ff', minHeight: '100vh' }
const titulo = { fontSize: 30, fontWeight: 900, color: '#0d47a1', marginBottom: 16 }
const bannerContainer = { position: 'relative' as const, width: '100%', height: 160, borderRadius: 20, overflow: 'hidden' as const, marginBottom: 16 }
const bannerImagem = { objectFit: 'cover' as const }
const input = { width: '100%', padding: 14, borderRadius: 14, border: '2px solid #bbdefb', marginBottom: 12 }
const abasContainer = { display: 'flex', gap: 8, overflowX: 'auto' as const, marginBottom: 20 }
const aba = { padding: '10px 16px', borderRadius: 999, border: 'none', fontWeight: 700, whiteSpace: 'nowrap' as const }
const card = { background: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }
const linhaTopo = { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }
const nomeProduto = { fontSize: 20, fontWeight: 800 }
const preco = { fontSize: 22, fontWeight: 900, color: '#1565c0' }
const boxOpcoes = { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 12 }
const botaoOpcao = { padding: '6px 12px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#e3f2fd' }
const textarea = { width: '100%', padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', marginBottom: 12 }
const controle = { display: 'flex', alignItems: 'center', gap: 12 }
const botaoMenos = { width: 44, height: 44, borderRadius: 12, border: 'none', background: '#e3f2fd', fontSize: 20 }
const botaoMais = { width: 44, height: 44, borderRadius: 12, border: 'none', background: '#1565c0', color: '#fff', fontSize: 20 }
const quantidade = { fontSize: 18, fontWeight: 900 }
const carrinhoBox = { position: 'fixed' as const, bottom: 16, left: 16, right: 16, background: '#0d47a1', color: '#fff', padding: 18, borderRadius: 20 }
const botaoEnviar = { width: '100%', marginTop: 10, padding: 16, borderRadius: 14, border: 'none', background: '#1565c0', color: '#fff', fontSize: 18, fontWeight: 'bold' }