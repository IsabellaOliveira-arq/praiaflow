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
  const [loading, setLoading] = useState(true)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    async function carregar() {
      if (!barracaId) return

      const { data: produtosData } = await supabase
        .from('produtos')
        .select('*')
        .eq('barraca_id', barracaId)
        .eq('ativo', true)
        .order('categoria', { ascending: true })

      const { data: opcoesData } = await supabase
        .from('opcoes_produto')
        .select('*')
        .eq('ativo', true)

      if (produtosData) setProdutos(produtosData)
      if (opcoesData) setOpcoes(opcoesData)

      setLoading(false)
    }

    carregar()
  }, [barracaId])

  function getOpcoes(produtoId: string) {
    return opcoes.filter(o => o.produto_id === produtoId)
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
    if (!nomeCliente || !localEntrega) {
      setMensagem('Preencha seu nome e o local de entrega 📍')
      return
    }

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert([{
        barraca_id: barracaId,
        nome_cliente: nomeCliente,
        local_entrega: localEntrega,
        total: total
      }])
      .select()
      .single()

    if (error || !pedido) {
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

    await supabase.from('itens_pedido').insert(itens)

    setCarrinho([])
    setMensagem('Pedido enviado com sucesso! 🏖️')
  }

  if (loading) {
    return <p style={{ padding: 20 }}>Carregando cardápio...</p>
  }

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: 16,
      background: '#f5f7fb',
      minHeight: '100vh'
    }}>
      
      {/* HEADER BONITO */}
      <h1 style={{
        color: '#0d47a1',
        fontWeight: 900,
        fontSize: 28,
        marginBottom: 16
      }}>
        PraiaFlow 🌊
      </h1>

      {/* COMANDA */}
      <input
        placeholder="👤 Seu nome (comanda individual)"
        value={nomeCliente}
        onChange={(e) => setNomeCliente(e.target.value)}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 16,
          border: '2px solid #e3f2fd',
          marginBottom: 10,
          fontSize: 16,
          background: '#fff'
        }}
      />

      {/* LOCAL */}
      <input
        placeholder="📍 Ex: Guarda-sol 12 / Cadeira Azul"
        value={localEntrega}
        onChange={(e) => setLocalEntrega(e.target.value)}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 16,
          border: '2px solid #e3f2fd',
          marginBottom: 20,
          fontSize: 16,
          background: '#fff'
        }}
      />

      {/* PRODUTOS EM CARDS BONITOS */}
      {produtos.map(produto => {
        const item = carrinho.find(i => i.produto.id === produto.id)
        const qtd = item?.quantidade || 0
        const opcoesProduto = getOpcoes(produto.id)

        return (
          <div key={produto.id} style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: 18,
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
          }}>
            
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#1a1a1a',
              marginBottom: 4
            }}>
              {produto.nome}
            </h2>

            <p style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: '#1565c0',
              marginBottom: 12
            }}>
              R$ {produto.preco}
            </p>

            {/* OPÇÕES EM BOTÕES BONITOS */}
            {opcoesProduto.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontWeight: 700, marginBottom: 6 }}>
                  Escolha uma opção:
                </p>
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

            {/* OBSERVAÇÕES */}
            <textarea
              placeholder="Observações (ex: sem gelo, pouco açúcar...)"
              onChange={(e) =>
                atualizarObservacao(produto.id, e.target.value)
              }
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                border: '1px solid #e0e0e0',
                marginBottom: 14,
                fontSize: 14
              }}
            />

            {/* CONTADOR BONITO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => alterarQuantidade(produto, -1)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  background: '#e3f2fd',
                  fontSize: 20,
                  fontWeight: 'bold'
                }}
              >
                -
              </button>

              <span style={{
                fontSize: 18,
                fontWeight: 800,
                minWidth: 20,
                textAlign: 'center'
              }}>
                {qtd}
              </span>

              <button
                onClick={() => alterarQuantidade(produto, 1)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  background: '#1565c0',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 'bold'
                }}
              >
                +
              </button>
            </div>
          </div>
        )
      })}

      {/* CARRINHO FIXO PREMIUM */}
      {carrinho.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          background: '#0d47a1',
          color: '#fff',
          padding: 18,
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
        }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            Total: R$ {total.toFixed(2)}
          </div>

          <button
            onClick={enviarPedido}
            style={{
              width: '100%',
              marginTop: 10,
              padding: 16,
              borderRadius: 14,
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
        <p style={{
          marginTop: 20,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {mensagem}
        </p>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <Cardapio />
    </Suspense>
  )
}
