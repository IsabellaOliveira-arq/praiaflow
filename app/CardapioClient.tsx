'use client'

import Image from 'next/image'
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
  opcaoSelecionada?: string
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
    const unicas = Array.from(
      new Set(produtos.map(p => (p.categoria || '').toLowerCase()))
    )
    return ['todas', ...unicas]
  }, [produtos])

  const produtosFiltrados =
    categoriaAtiva === 'todas'
      ? produtos
      : produtos.filter(
          p => (p.categoria || '').toLowerCase() === categoriaAtiva
        )

  function selecionarOpcao(produto: Produto, opcao: string) {
    setCarrinho(prev => {
      const existente = prev.find(i => i.produto.id === produto.id)

      if (existente) {
        return prev.map(i =>
          i.produto.id === produto.id
            ? { ...i, opcaoSelecionada: opcao }
            : i
        )
      }

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
    setCarrinho(prev => {
      const existente = prev.find(i => i.produto.id === produto.id)
      const temOpcoes = opcoes[produto.id]?.length > 0

      if (temOpcoes && !existente?.opcaoSelecionada) {
        alert('Selecione uma opção primeiro.')
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
    if (!barracaId) return

    const itensInvalidos = carrinho.some(item =>
      opcoes[item.produto.id]?.length > 0 &&
      !item.opcaoSelecionada
    )

    if (itensInvalidos) {
      alert('Selecione as opções obrigatórias.')
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

    const itens = carrinho.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
      observacoes: item.opcaoSelecionada
        ? `Opção: ${item.opcaoSelecionada} | ${item.observacao}`
        : item.observacao,
    }))

    await supabase.from('itens_pedido').insert(itens)

    alert('Pedido enviado!')
    setCarrinho([])
  }

  if (loading) return <h2>Carregando...</h2>

  return (
    <div style={container}>
      <h1 style={titulo}>PraiaFlow 🌊</h1>

      {produtosFiltrados.map(produto => {
        const item = carrinho.find(i => i.produto.id === produto.id)
        const qtd = item?.quantidade || 0
        const opcoesProduto = opcoes[produto.id] || []

        return (
          <div key={produto.id} style={card}>
            <div style={linhaTopo}>
              <div style={nomeProduto}>{produto.nome}</div>
              <div style={preco}>
                R$ {produto.preco.toFixed(2)}
              </div>
            </div>

            {opcoesProduto.length > 0 && (
              <div style={radioGroup}>
                {opcoesProduto.map(opcao => (
                  <label key={opcao} style={radioItem}>
                    <input
                      type="radio"
                      name={`opcao-${produto.id}`}
                      checked={item?.opcaoSelecionada === opcao}
                      onChange={() =>
                        selecionarOpcao(produto, opcao)
                      }
                    />
                    <span>{opcao}</span>
                  </label>
                ))}
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

      {carrinho.length > 0 && (
        <div style={carrinhoBox}>
          <div>Total: R$ {total.toFixed(2)}</div>
          <button style={botaoEnviar} onClick={enviarPedido}>
            Enviar Pedido
          </button>
        </div>
      )}
    </div>
  )
}

const container = { maxWidth: 520, margin: '0 auto', padding: 16 }
const titulo = { fontSize: 28, fontWeight: 900, marginBottom: 16 }
const card = { background: '#fff', padding: 16, marginBottom: 16, borderRadius: 16 }
const linhaTopo = { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }
const nomeProduto = { fontWeight: 800 }
const preco = { fontWeight: 900 }
const radioGroup = { display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 10 }
const radioItem = { display: 'flex', gap: 6, alignItems: 'center' }
const textarea = { width: '100%', marginBottom: 12 }
const controle = { display: 'flex', gap: 12, alignItems: 'center' }
const botaoMenos = { width: 40, height: 40 }
const botaoMais = { width: 40, height: 40 }
const quantidade = { fontWeight: 900 }
const carrinhoBox = { position: 'fixed' as const, bottom: 10, left: 10, right: 10, background: '#1565c0', color: '#fff', padding: 16, borderRadius: 16 }
const botaoEnviar = { width: '100%', padding: 12 }