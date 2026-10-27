import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('photo feedback is a textarea beside Send without the old toggle or hidden icon', () => {
  const source = fs.readFileSync('components/PhotoFeedback.tsx', 'utf8');
  const css = fs.readFileSync('components/photo-feedback.css', 'utf8');
  assert.match(source, /className="delivery-photo-feedback-form"/);
  assert.match(source, /<textarea ref=\{fieldRef\}/);
  assert.match(source, /rows=\{1\}/);
  assert.match(source, /Math\.min\(field\.scrollHeight,280\)/);
  assert.match(source, /'Gửi'/);
  assert.doesNotMatch(source, /aria-hidden|delivery-photo-feedback-toggle/);
  assert.match(css, /display:flex;align-items:flex-end/);
});
test('the caption is inside the picture at bottom-left, selection/download stay in footer', () => {
  const source = fs.readFileSync('components/ClientDelivery.tsx','utf8');
  const css = fs.readFileSync('components/delivery.css','utf8');
  assert.match(source, /<div className="delivery-photo-image"><img[^>]*\/><div className="delivery-photo-title"/);
  assert.match(source, /<div className="delivery-photo-footer"><div className="delivery-photo-actions">/);
  assert.match(css, /\.delivery-photo-image > \.delivery-photo-title/);
  assert.match(css, /bottom:0;left:0;right:0;top:auto/);
});
