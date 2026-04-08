const { verifyToken } = require('../routes/auth');

module.exports = function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
