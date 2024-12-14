const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

app.use(express.json());
// simple logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  let message = `[${timestamp}] ${req.method} ${req.url}`;
  
  // Log request body if it exists and not a file upload
  if (req.headers['content-type'] !== 'multipart/form-data' && Object.keys(req.body).length) {
    message += `\nRequest body: ${JSON.stringify(req.body, null, 2)}`;
  }

  console.log(message);
  next();
});

// Add the new middleware here
app.use((req, res, next) => {
  if (req.method === 'GET' && req.headers['content-type']) {
    return res.status(400).json({
      error: 'Content-Type header not allowed for GET requests'
    });
  }
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// In-memory pet store database
const pets = new Map([
  [1, { id: 1, name: 'Max', species: 'Dog', age: 3, status: 'available', photos: [] }],
  [2, { id: 2, name: 'Whiskers', species: 'Cat', age: 5, status: 'pending', photos: [] }],
  [3, { id: 3, name: 'Bubbles', species: 'Fish', age: 1, status: 'sold', photos: [] }],
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
    status: 'available',
    photos: []
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

// New endpoints for file uploads

// POST /pets/{id}/photos - Upload a single photo for a pet
app.post('/pets/:id/photos', upload.single('photo'), (req, res) => {
  const id = parseInt(req.params.id);
  const pet = pets.get(id);
  
  if (!pet) {
    // Clean up uploaded file if pet doesn't exist
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(404).json({ error: 'Pet not found' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const photoUrl = `http://localhost:${port}/uploads/${path.basename(req.file.path)}`;
  pet.photos.push(photoUrl);
  
  res.status(201).json({
    message: 'Photo uploaded successfully',
    photoUrl: photoUrl
  });
});

// POST /pets/{id}/documents - Upload multiple documents for a pet
app.post('/pets/:id/documents', upload.array('documents', 5), (req, res) => {
  const id = parseInt(req.params.id);
  const pet = pets.get(id);
  
  if (!pet) {
    // Clean up uploaded files if pet doesn't exist
    if (req.files) {
      req.files.forEach(file => fs.unlinkSync(file.path));
    }
    return res.status(404).json({ error: 'Pet not found' });
  }
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No documents uploaded' });
  }

  const uploadedFiles = req.files.map(file => {
    const fileUrl = `http://localhost:${port}/uploads/${path.basename(file.path)}`;
    return {
      originalName: file.originalname,
      url: fileUrl
    };
  });

  res.status(201).json({
    message: 'Documents uploaded successfully',
    files: uploadedFiles
  });
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
      },
      '/pets/{id}/photos': {
        post: {
          operationId: 'uploadPetPhoto',
          summary: 'Upload a photo for a pet',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID of pet to upload photo for',
              schema: {
                type: 'integer'
              }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['photo'],
                  properties: {
                    photo: {
                      type: 'string',
                      format: 'binary',
                      description: 'The photo to upload (JPEG, PNG, or GIF)'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Photo uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string'
                      },
                      photoUrl: {
                        type: 'string',
                        format: 'uri'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid input or no file uploaded'
            },
            '404': {
              description: 'Pet not found'
            }
          }
        }
      },
      '/pets/{id}/documents': {
        post: {
          operationId: 'uploadPetDocuments',
          summary: 'Upload multiple documents for a pet',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID of pet to upload documents for',
              schema: {
                type: 'integer'
              }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['documents'],
                  properties: {
                    documents: {
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'binary'
                      },
                      description: 'The documents to upload (max 5 files)'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Documents uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string'
                      },
                      files: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            originalName: {
                              type: 'string'
                            },
                            url: {
                              type: 'string',
                              format: 'uri'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid input or no files uploaded'
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
            },
            photos: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri'
              },
              description: 'URLs of pet photos'
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