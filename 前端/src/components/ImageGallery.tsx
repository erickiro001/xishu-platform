import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

interface ImageGalleryProps {
  images: string[];
  /** 图片 alt 前缀，实际渲染为 `${alt}1`, `${alt}2` ... */
  alt?: string;
  /** 包裹所有图片的外层 div 的 className（用于控制间距和布局） */
  className?: string;
  /** 每张图片外层 div 的 className（圆角、阴影等样式） */
  imageWrapperClass?: string;
}

export default function ImageGallery({
  images,
  alt = '',
  className = '',
  imageWrapperClass = '',
}: ImageGalleryProps) {
  if (images.length === 0) return null;

  const showBanner = images.length > 1;
  const enableLoop = images.length >= 2;

  return (
    <PhotoProvider
      maskClosable
      bannerVisible={showBanner}
      loop={enableLoop ? 2 : false}
    >
      <div className={className}>
        {images.map((img, i) => (
          <PhotoView key={i} src={img}>
            <div className={imageWrapperClass}>
              <img
                src={img}
                alt={`${alt}${i + 1}`}
                className="w-full object-contain cursor-zoom-in"
              />
            </div>
          </PhotoView>
        ))}
      </div>
    </PhotoProvider>
  );
}
