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

type Opcao = {
  id: string
  produto_id: string
  nome: string
  ativo: boolean
}

type ItemCarrinho = {
  produto: Produto
  quantidade: number
  opcaoSelecionada?: string
  observacoes?: string
}

function Cardapio() {
  const searchParams = useSearchParams()
  const barracaId = searchParams.get('barraca')

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [opcoes, setOpcoes] = useState<Opcao[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [nomeCliente, setNomeCliente] = useState('')
  const [localEntrega, setLocalEntrega] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarDados() {
      if (!barracaId) return

      const { data: produtosData } = await supabase
        .from('produtos')
        .select('*')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      const { data: opcoesData } = await supabase
        .from('opcoes_produto')
        .select('*')
        .eq('ativo', true)

      if (produtosData) setProdutos(produtosData)
      if (opcoesData) setOpcoes(opcoesData)

      setLoading(false)
    }

    carregarDados()
  }, [barracaId])

  function getOpcoesDoProduto(produtoId: string) {
    return opcoes.filter(op => op.produto_id === produtoId)
  }

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
        return [...prev, { produto, quantidade: 1 }]
      }

      return prev
    })
  }

  function selecionarOpcao(produtoId: string, opcao: string) {
    setCarrinho(prev =>
      prev.map(item =>
        item.produto.id === produtoId
          ? { ...item, opcaoSelecionada: opcao }
          : item
      )
    )
  }

  function atualizarObservacao(produtoId: string, texto: string) {
    setCarrinho(prev =>
      prev.map(item =>
        item.produto.id === produtoId
          ? { ...item, observacoes: texto }
          : item
      )
    )
  }

  const total = carrinho.reduce(
    (acc, item) => acc + item.produto.preco * item.quantidade,
    0
  )

  async function enviarPedido() {
    if (!barracaId) {
      setMensagem('Barraca não identificada.')
      return
    }

    if (!nomeCliente || !localEntrega) {
      setMensagem('Preencha seu nome e o local de entrega 📍')
      return
    }

    setMensagem('Enviando pedido...')

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert([{
        barraca_id: barracaId,
        nome_cliente: nomeCliente,
        local_entrega: localEntrega,
        total: total
        // status NÃO precisa enviar porque já tem default = 'novo'
      }])
      .select()
      .single()

    if (error || !pedido) {
      console.error(error)
      setMensagem('Erro ao enviar pedido 😢')
      return
    }

    const itens = carrinho.map(item => ({
      pedido_id: pedido.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco,
      observacoes: `Opção: ${item.opcaoSelecionada || 'Nenhuma'} | Obs: ${item.observacoes || ''}`
    }))

    const { error: itensError } = await supabase
      .from('itens_pedido')
      .insert(itens)

    if (itensError) {
      console.error(itensError)
      setMensagem('Erro ao salvar itens do pedido')
      return
    }

    setCarrinho([])
    setMensagem(`Pedido enviado com sucesso! 🏖️ Entrega em: ${localEntrega}`)
  }

  if (loading) {
    return <p style={{ padding: 20 }}>Carregando cardápio...</p>
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h1 style={{ color: '#0d47a1', fontWeight: 900 }}>
        PraiaFlow 🌊
      </h1>

      <input
        placeholder="👤 Seu nome (comanda individual)"
        value={nomeCliente}
        onChange={(e) => setNomeCliente(e.target.value)}
        style={{
          width: '100%',
          padding: 14,
          marginBottom: 10,
          borderRadius: 12,
          border: '2px solid #e3f2fd',
          fontSize: 16
        }}
      />

      <input
        placeholder="📍 Ex: Guarda-sol 12 / Cadeira Azul"
        value={localEntrega}
        onChange={(e) => setLocalEntrega(e.target.value)}
        style={{
          width: '100%',
          padding: 14,
          marginBottom: 20,
          borderRadius: 12,
          border: '2px solid #e3f2fd',
          fontSize: 16
        }}
      />

      {produtos.map(produto => {
        const item = carrinho.find(i => i.produto.id === produto.id)
        const qtd = item?.quantidade || 0
        const opcoesProduto = getOpcoesDoProduto(produto.id)

        return (
          <div key={produto.id}
            style={{
              background: '#ffffff',
              padding: 18,
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
            }}>
            
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>
              {produto.nome}
            </h3>

            <p style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: '#1565c0'
            }}>
              R$ {produto.preco}
            </p>

            {opcoesProduto.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontWeight: 700 }}>Escolha uma opção:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {opcoesProduto.map(op => (
                    <button
                      key={op.id}
                      onClick={() => selecionarOpcao(produto.id, op.nome)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: '2px solid #1565c0',
                        background:
                          item?.opcaoSelecionada === op.nome ? '#1565c0' : '#fff',
                        color:
                          item?.opcaoSelecionada === op.nome ? '#fff' : '#1565c0',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {op.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              placeholder="Observações (ex: sem gelo, pouco açúcar...)"
              onChange={(e) =>
                atualizarObservacao(produto.id, e.target.value)
              }
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
                marginBottom: 12,
                border: '1px solid #ddd'
              }}
            />

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={() => alterarQuantidade(produto, -1)}>-</button>
              <span style={{ fontSize: 18, fontWeight: 'bold' }}>{qtd}</span>
              <button onClick={() => alterarQuantidade(produto, 1)}>+</button>
            </div>
          </div>
        )
      })}

      {carrinho.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          background: '#0d47a1',
          color: '#fff',
          padding: 18,
          borderRadius: 18
        }}>
          <strong style={{ fontSize: 18 }}>
            Total: R$ {total.toFixed(2)}
          </strong>

          <button
            onClick={enviarPedido}
            style={{
              width: '100%',
              marginTop: 10,
              padding: 16,
              borderRadius: 12,
              border: 'none',
              background: '#1565c0',
              color: '#fff',
              fontSize: 16,
              fontWeight: 'bold'
            }}
          >
            Enviar Pedido 🏖️
          </button>
        </div>
      )}

      {mensagem && (
        <p style={{ marginTop: 20, fontWeight: 'bold' }}>
          {mensagem}
        </p>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<p>Carregando cardápio...</p>}>
      <Cardapio />
    </Suspense>
  )
}
