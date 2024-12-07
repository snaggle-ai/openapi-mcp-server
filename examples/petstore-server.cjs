const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
// simple logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  let message = `[${timestamp}] ${req.method} ${req.url}`;
  
  // Log request body if it exists
  if (Object.keys(req.body).length) {
    message += `\nRequest body: ${JSON.stringify(req.body, null, 2)}`;
  }

  console.log(message);
  next();
});

// In-memory pet store database
const pets = new Map([
  [1, { id: 1, name: 'Max', species: 'Dog', age: 3, status: 'available' }],
  [2, { id: 2, name: 'Whiskers', species: 'Cat', age: 5, status: 'pending' }],
  [3, { id: 3, name: 'Bubbles', species: 'Fish', age: 1, status: 'sold' }],
]);

// GET /pets - List all pets
app.get('/pets', (req, res) => {
  const status = req.query.status;
  if (status) {
    const filtered = Array.from(pets.values()).filter(pet => pet.status === status);
    return res.json(filtered);
  }
  res.json(Array.from(pets.values()));
});

// GET /pets/{id} - Get pet by ID
app.get('/pets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const pet = pets.get(id);
  
  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  
  res.json(pet);
});

// POST /pets - Add a new pet
app.post('/pets', (req, res) => {
  const { name, species, age } = req.body;
  
  if (!name || !species || !age) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const id = Math.max(...pets.keys()) + 1;
  const newPet = {
    id,
    name,
    species,
    age,
    status: 'available'
  };
  
  pets.set(id, newPet);
  res.status(201).json(newPet);
});

// PUT /pets/{id} - Update pet status
app.put('/pets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  
  if (!['available', 'pending', 'sold'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const pet = pets.get(id);
  if (!pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  
  pet.status = status;
  res.json(pet);
});

// DELETE /pets/{id} - Delete a pet
app.delete('/pets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  if (!pets.has(id)) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  
  pets.delete(id);
  res.status(204).send();
});

// Serve OpenAPI spec
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Petstore API',
      version: '1.0.0',
      description: 'A simple pet store API'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      }
    ],
    paths: {
      '/pets': {
        get: {
          operationId: 'listPets',
          summary: 'List all pets',
          parameters: [
            {
              name: 'status',
              in: 'query',
              description: 'Filter pets by status',
              schema: {
                type: 'string',
                enum: ['available', 'pending', 'sold']
              }
            }
          ],
          responses: {
            '200': {
              description: 'A list of pets',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Pet'
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          operationId: 'createPet',
          summary: 'Add a new pet to the store',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'species', 'age'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'The name of the pet'
                    },
                    species: {
                      type: 'string',
                      description: 'The species of the pet'
                    },
                    age: {
                      type: 'integer',
                      description: 'The age of the pet in years'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Pet created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet'
                  }
                }
              }
            },
            '400': {
              description: 'Invalid input'
            }
          }
        }
      },
      '/pets/{id}': {
        get: {
          operationId: 'getPetById',
          summary: 'Find pet by ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID of pet to return',
              schema: {
                type: 'integer'
              }
            }
          ],
          responses: {
            '200': {
              description: 'successful operation',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet'
                  }
                }
              }
            },
            '404': {
              description: 'Pet not found'
            }
          }
        },
        put: {
          operationId: 'updatePetStatus',
          summary: 'Update pet status',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID of pet to update',
              schema: {
                type: 'integer'
              }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['available', 'pending', 'sold'],
                      description: 'Status of the pet'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Pet status updated',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Pet'
                  }
                }
              }
            },
            '400': {
              description: 'Invalid status value'
            },
            '404': {
              description: 'Pet not found'
            }
          }
        },
        delete: {
          operationId: 'deletePet',
          summary: 'Delete a pet',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID of pet to delete',
              schema: {
                type: 'integer'
              }
            }
          ],
          responses: {
            '204': {
              description: 'Pet deleted successfully'
            },
            '404': {
              description: 'Pet not found'
            }
          }
        }
      }
    },
    components: {
      schemas: {
        Pet: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the pet'
            },
            name: {
              type: 'string',
              description: 'The name of the pet'
            },
            species: {
              type: 'string',
              description: 'The species of the pet'
            },
            age: {
              type: 'integer',
              description: 'The age of the pet in years'
            },
            status: {
              type: 'string',
              description: 'Pet availability status',
              enum: ['available', 'pending', 'sold']
            }
          }
        }
      }
    }
  });
});

function createPetstoreServer(port = 3000) {
  const server = app.listen(port, () => {
    console.log(`Petstore API server running at http://localhost:${port}`);
    console.log(`OpenAPI spec available at http://localhost:${port}/openapi.json`);
  });
  return server;
}

// For direct execution
if (require.main === module) {
  createPetstoreServer();
}

module.exports = { createPetstoreServer }; 