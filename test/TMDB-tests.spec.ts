import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';

describe('TMDB API - Testes de Integração', () => {
  const p = pactum;
  const rep = SimpleReporter;

  const baseUrl = 'https://api.themoviedb.org/4';
  const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmNzRkOWEzMGE0ZjQzOTEwZTNiYjczMGZmYmM3MjlmOCIsIm5iZiI6MTc5MDEwODIxMS45NDQxOTAzLCJqdGkiOiI2YWIyZTFkM2Y4NTZkZmJmMjBkMjM2OWIiLCJzdWIiOiI2N2Y2ZTVjZWNjZTc2OTAyMzBhY2ZjNGEiLCJzY29wZXMiOlsiYXBpX3JlYWQiLCJhcGlfd3JpdGUiXSwidmVyc2lvbiI6Mn0.O_bKv5jfBGtlS57yS1Yz9-pAL0OVg77piMpfdI2NRLw';

  let idLista = '';

  const idFilme = 157336;

  const nomeLista = 'Filmes para assistir - Teste de Integração';
  const nomeListaAtualizada = 'Filmes favoritos - Teste de Integração';

  p.request.setDefaultTimeout(90000);

  beforeAll(async () => {
    p.reporter.add(rep);
    
    idLista = await p
      .spec()
      .post(`${baseUrl}/list`)
      .withHeaders('Authorization', token)
      .withHeaders('Content-Type', 'application/json')
      .withJson({
        name: nomeLista,
        iso_639_1: 'pt',
        description: faker.lorem.sentence(),
        public: 0
      })
      .expect((ctx) => {
        expect([
          StatusCodes.OK,
          StatusCodes.CREATED
        ]).toContain(ctx.res.statusCode);
      })
      .expectJsonSchema({
        type: 'object',
        properties: {
          id: {
            type: 'number'
          },
          success: {
            type: 'boolean'
          },
          status_code: {
            type: 'number'
          },
          status_message: {
            type: 'string'
          }
        },
        required: [
          'id',
          'success',
          'status_code',
          'status_message'
        ]
      })
      .returns('id');
  });

  describe('Validações de autenticação', () => {
    it('Não deve criar uma lista sem token de autorização', async () => {
      await p
        .spec()
        .post(`${baseUrl}/list`)
        .withHeaders('Content-Type', 'application/json')
        .withJson({
          name: 'Lista sem autorização',
          iso_639_1: 'pt',
          description: 'Tentativa sem token',
          public: 0
        })
        .expectStatus(StatusCodes.UNAUTHORIZED)
        .expectJsonSchema({
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            status_code: {
              type: 'number'
            },
            status_message: {
              type: 'string'
            }
          },
          required: [
            'success',
            'status_code',
            'status_message'
          ]
        });
    });

    it('Não deve acessar a API com token inválido', async () => {
      await p
        .spec()
        .get(`${baseUrl}/list/${idLista}`)
        .withHeaders(
          'Authorization',
          'Bearer token_invalido'
        )
        .expectStatus(StatusCodes.UNAUTHORIZED);
    });
  });

  describe('Listas de filmes', () => {
    it('Busca a lista criada', async () => {
      await p
        .spec()
        .get(`${baseUrl}/list/${idLista}`)
        .withHeaders('Authorization', token)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          id: idLista,
          name: nomeLista
        })
        .expectJsonSchema({
          type: 'object',
          properties: {
            id: {
              type: 'number'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            item_count: {
              type: 'number'
            },
            results: {
              type: 'array'
            }
          },
          required: [
            'id',
            'name',
            'description',
            'item_count',
            'results'
          ]
        });
    });

    it('Atualiza os dados da lista', async () => {
      await p
        .spec()
        .put(`${baseUrl}/list/${idLista}`)
        .withHeaders('Authorization', token)
        .withHeaders('Content-Type', 'application/json')
        .withJson({
          name: nomeListaAtualizada,
          description:
            'Lista atualizada através dos testes de integração',
          public: 0
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonLike({
          success: true
        });
    });

    it('Busca a lista e verifica se foi atualizada', async () => {
      await p
        .spec()
        .get(`${baseUrl}/list/${idLista}`)
        .withHeaders('Authorization', token)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          id: idLista,
          name: nomeListaAtualizada,
          description:
            'Lista atualizada através dos testes de integração'
        });
    });

    it('Não deve encontrar uma lista inexistente', async () => {
      await p
        .spec()
        .get(`${baseUrl}/list/0`)
        .withHeaders('Authorization', token)
        .expectStatus(StatusCodes.NOT_FOUND)
        .expectJsonLike({
          success: false
        });
    });
  });

  describe('Filmes da lista', () => {
    it('Adiciona um filme à lista', async () => {
      await p
        .spec()
        .post(`${baseUrl}/list/${idLista}/items`)
        .withHeaders('Authorization', token)
        .withHeaders('Content-Type', 'application/json')
        .withJson({
          items: [
            {
              media_type: 'movie',
              media_id: idFilme
            }
          ]
        })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          success: true
        });
    });

    it('Busca a lista e verifica se o filme foi adicionado', async () => {
      await p
        .spec()
        .get(`${baseUrl}/list/${idLista}`)
        .withHeaders('Authorization', token)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          results: [
            {
              id: idFilme,
              media_type: 'movie'
            }
          ]
        });
    });

    it('Atualiza o comentário de um filme da lista', async () => {
      await p
        .spec()
        .put(`${baseUrl}/list/${idLista}/items`)
        .withHeaders('Authorization', token)
        .withHeaders('Content-Type', 'application/json')
        .withJson({
          items: [
            {
              media_type: 'movie',
              media_id: idFilme,
              comment:
                'Filme atualizado pelo teste de integração'
            }
          ]
        })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          success: true
        });
    });

    it('Verifica se o filme continua na lista após atualização', async () => {
      await p
        .spec()
        .get(`${baseUrl}/list/${idLista}`)
        .withHeaders('Authorization', token)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          results: [
            {
              id: idFilme,
              media_type: 'movie'
            }
          ]
        });
    });

    it('Remove o filme da lista', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/list/${idLista}/items`)
        .withHeaders('Authorization', token)
        .withHeaders('Content-Type', 'application/json')
        .withJson({
          items: [
            {
              media_type: 'movie',
              media_id: idFilme
            }
          ]
        })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          success: true
        });
    });

    it('Verifica se o filme foi removido', async () => {
      await p
        .spec()
        .get(`${baseUrl}/list/${idLista}`)
        .withHeaders('Authorization', token)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          item_count: 0
        });
    });
  });

  afterAll(async () => {
    if (idLista) {
      await p
        .spec()
        .delete(`${baseUrl}/list/${idLista}`)
        .withHeaders('Authorization', token)
        .expectStatus(StatusCodes.OK);
    }

    p.reporter.end();
  });
});