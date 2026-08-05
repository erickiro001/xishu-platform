import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Check, X } from 'lucide-react';
import { submitSolutionApplication } from '@/lib/services';
import { ApiError } from '@/lib/api';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function SolutionFormPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    companyName: '',
    solutionName: '',
    solutionDesc: '',
    contactName: '',
    phone: '',
    email: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件 "${file.name}" 超过100MB限制，已忽略`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (
      !form.companyName.trim() ||
      !form.solutionName.trim() ||
      !form.contactName.trim() ||
      !form.phone.trim()
    ) {
      setFormError('请填写企业名称、解决方案名称、联系人和手机号码');
      return;
    }

    setSubmitting(true);
    try {
      await submitSolutionApplication({
        company_name: form.companyName.trim(),
        solution_name: form.solutionName.trim(),
        description: form.solutionDesc.trim() || '暂无',
        contact_person: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
      }, files);
      setSubmitted(true);
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '提交失败，请稍后重试';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">提交成功</h2>
        <p className="text-sm text-gray-500 text-center">
          您的解决方案信息已提交，审核通过后将入驻展厅
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 头部 - 桌面端下移至顶部导航栏(64px)之下 */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-100 px-4 h-12 flex items-center fixed-header-desktop-offset">
        <div className="desktop-container w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 -ml-2 transition-transform active:scale-90 duration-150"
        >
          <ArrowLeft size={20} className="text-gray-900" />
        </button>
        <h1 className="absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900 pointer-events-none">
          提供解决方案
        </h1>
        </div>
      </div>

      {/* 表单 - 桌面端 pt 需加上顶部导航栏高度(64px) */}
      <form onSubmit={handleSubmit} className="px-4 pt-16 md:pt-32 pb-8 space-y-5 desktop-container">
        {/* 企业名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            企业名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="请输入企业名称"
            required
            className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* 解决方案名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            解决方案名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="solutionName"
            value={form.solutionName}
            onChange={handleChange}
            placeholder="请输入解决方案名称"
            required
            className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* 方案介绍 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            方案介绍
          </label>
          <textarea
            name="solutionDesc"
            value={form.solutionDesc}
            onChange={handleChange}
            placeholder="请介绍您的解决方案（解决什么问题、AI应用价值，选填）"
            rows={4}
            className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200 resize-none"
          />
        </div>

        {/* 联系人 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            联系人 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="contactName"
            value={form.contactName}
            onChange={handleChange}
            placeholder="请输入联系人姓名"
            required
            className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* 手机号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            手机号码 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="请输入手机号码"
            required
            className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* 邮箱 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            邮箱
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="请输入邮箱地址（选填）"
            className="w-full px-3 py-3 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* 附件上传 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            附件上传
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp,.heic"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-2 transition-colors active:bg-gray-50"
          >
            <Upload size={20} className="text-gray-400" />
            <span className="text-xs text-gray-400">点击上传方案附件（文档/图片，单个文件≤100MB）</span>
          </button>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{file.name}</p>
                    <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} className="ml-2 p-1 text-gray-400 active:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 提交按钮 */}
        {formError && <p className="text-[13px] text-red-500 mt-2">{formError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-medium shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-6"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              提交中...
            </span>
          ) : (
            '提交方案'
          )}
        </button>
      </form>
    </div>
  );
}
