UPDATE products
SET description = E'**Размерийн заавар:**\nS → ихэвчлэн 45–55 кг\nM → ихэвчлэн 55–62 кг\nL → ихэвчлэн 62–70 кг\nXL → ихэвчлэн 70–80 кг\n\n' || COALESCE(description, '')
WHERE brand_id = '24c51924-70f8-453c-b6cd-7e6eccbda36e'
  AND sizes IS NOT NULL
  AND jsonb_array_length(sizes) > 0
  AND (description IS NULL OR position('Размерийн заавар' in description) = 0);